package user

import (
	"context"
	"fmt"
	"karopon/src/database"
	"sync"
	"time"

	"github.com/minnowo/log4zero"
	"golang.org/x/crypto/bcrypt"
)

var log = log4zero.Get("user-registry")

var (
	ErrUserDoesNotExist         error = fmt.Errorf("user does not exist")
	ErrUserPasswordDoesNotMatch error = fmt.Errorf("user password does not match")
)

type Session struct {
	userID  int
	expires time.Time
}

func (s *Session) Expired() bool {
	return s.expires.Before(time.Now())
}

type UserRegistry struct {

	// usersById and usersByName should always be modified together.
	// They may or may not contain the same pointer value.
	usersById   map[int]*database.TblUser
	usersByName map[string]*database.TblUser
	usersLock   sync.RWMutex

	sessions     map[AccessTokenHash]Session
	sessionsLock sync.RWMutex

	lastClearTime time.Time

	db database.DB
}

func NewRegistry(db database.DB) *UserRegistry {
	return &UserRegistry{
		usersByName: make(map[string]*database.TblUser),
		usersById:   make(map[int]*database.TblUser),
		sessions:    make(map[AccessTokenHash]Session),
		db:          db,
	}
}

func (u *UserRegistry) NewToken(ctx context.Context, userId int, sessionExpireTime int64) (AccessToken, time.Time, error) {

	var token AccessToken

	expires := time.Now().Add(time.Second * time.Duration(max(60, sessionExpireTime)))

	token.New()
	tokenHash := token.Hash()

	session := database.TblUserSession{
		Expires: database.TimeMillis(expires),
		UserID:  userId,
		Token:   tokenHash[:],
	}

	if err := u.db.AddUserSession(ctx, &session); err != nil {

		// unique violation is statistically impossible.
		// we're not going to bother re-trying for the case it does happen.
		log.Error().Err(err).Msg("unable to add user session to the database")

		return AccessToken{}, time.Time{}, err
	}

	u.sessionsLock.Lock()
	u.sessions[tokenHash] = Session{
		userID:  userId,
		expires: expires,
	}
	u.sessionsLock.Unlock()

	log.Debug().Time("expireTime", expires).Int("userId", userId).Msg("Created new session token")

	return token, expires, nil
}

func (u *UserRegistry) ExpireToken(tokenStr string) {

	var token AccessToken

	if err := token.FromString(tokenStr); err != nil {
		return
	}

	hash := token.Hash()

	deleteFromDb := func() bool {

		u.sessionsLock.Lock()
		defer u.sessionsLock.Unlock()

		_, ok := u.sessions[hash]
		if ok {
			delete(u.sessions, hash)
		}
		return ok
	}()

	if deleteFromDb {
		// Want this to block the caller until it's gone from the db.
		// If the user logs out, the token must be deleted from the db otherwise they could log back in using it later.
		u.db.DeleteUserSessionByToken(context.Background(), hash[:])
	}
}

func (u *UserRegistry) CheckToken(ctx context.Context, tokenStr string) (*database.TblUser, bool) {

	var token AccessToken

	if err := token.FromString(tokenStr); err != nil {
		return nil, false
	}

	hash := token.Hash()

	u.sessionsLock.RLock()
	session, ok := u.sessions[hash]
	u.sessionsLock.RUnlock()

	if !ok {
		log.Debug().Msg("checking database for user token")

		var dbSession database.TblUserSession

		if err := u.db.LoadUserSession(ctx, hash[:], &dbSession); err != nil {
			return nil, false
		}

		session = Session{
			userID:  dbSession.UserID,
			expires: dbSession.Expires.Time(),
		}

		if session.Expired() {
			return nil, false
		}

		u.sessionsLock.Lock()
		u.sessions[hash] = session
		u.sessionsLock.Unlock()
	}

	expired := session.Expired()

	log.Debug().Bool("isExpired", expired).Time("expireTime", session.expires).Msg("Session expire check")

	if expired {

		if !u.ClearExpiredSessionsOncePerHour() {
			u.sessionsLock.Lock()
			delete(u.sessions, hash)
			u.sessionsLock.Unlock()
		}
		return nil, false
	}

	return u.GetUserBySession(ctx, session)
}

func (u *UserRegistry) GetUserBySession(ctx context.Context, session Session) (*database.TblUser, bool) {

	var userPtr *database.TblUser

	u.usersLock.RLock()
	if user, ok := u.usersById[session.userID]; ok {
		userPtr = user.Copy()
	}
	u.usersLock.RUnlock()

	if userPtr != nil {
		return userPtr, true
	}

	var dbUser database.TblUser

	if err := u.db.LoadUserById(ctx, session.userID, &dbUser); err != nil {
		return nil, false
	}

	u.PutUser(&dbUser)

	return &dbUser, true
}

func (u *UserRegistry) Login(ctx context.Context, name, password string) (string, time.Time, error) {

	var userId int
	var userPassword []byte
	var userSessionTime int64

	checkDB := true

	u.usersLock.RLock()

	if usr, ok := u.usersByName[name]; ok {
		log.Debug().Int("id", usr.ID).Msg("found in memory user")
		checkDB = false
		userId = usr.ID
		userPassword = append([]byte(nil), usr.Password...)
		userSessionTime = usr.SessionExpireTimeSeconds
	} else {
		log.Debug().Str("name", name).Msg("no user in memory, checking database")
	}

	u.usersLock.RUnlock()

	if checkDB {

		var dbUser database.TblUser

		if err := u.db.LoadUser(ctx, name, &dbUser); err != nil {
			return "", time.Time{}, ErrUserDoesNotExist
		}

		u.PutUser(&dbUser)

		userId = dbUser.ID
		userPassword = append([]byte(nil), dbUser.Password...)
		userSessionTime = dbUser.SessionExpireTimeSeconds
	}

	err := bcrypt.CompareHashAndPassword(userPassword, []byte(password))

	if err != nil {

		if err != bcrypt.ErrMismatchedHashAndPassword {
			log.Warn().Err(err).Str("user", name).Msg("Unexpected error comparing hash and password")
		}

		return "", time.Time{}, ErrUserPasswordDoesNotMatch
	}

	token, expires, err := u.NewToken(ctx, userId, userSessionTime)

	if err != nil {
		return "", time.Time{}, err
	}

	return token.String(), expires, nil
}

func (u *UserRegistry) PutUserWithNewName(oldName string, user *database.TblUser) {

	u.usersLock.Lock()
	defer u.usersLock.Unlock()

	if old, ok := u.usersByName[oldName]; ok {
		// Intentionally delete the ID here too.
		// To prevent a possible case where the new user ID doesn't replace the old one.
		delete(u.usersByName, oldName)
		delete(u.usersById, old.ID)
	}

	cpy := user.Copy()

	u.usersByName[user.Name] = cpy
	u.usersById[user.ID] = cpy
}

func (u *UserRegistry) PutUser(user *database.TblUser) {

	u.usersLock.Lock()
	defer u.usersLock.Unlock()

	cpy := user.Copy()

	u.usersByName[user.Name] = cpy
	u.usersById[user.ID] = cpy
}

func (u *UserRegistry) ClearExpiredSessions() {

	u.lastClearTime = time.Now()

	u.sessionsLock.Lock()

	for key, session := range u.sessions {

		if session.Expired() {
			delete(u.sessions, key)
		}
	}

	u.sessionsLock.Unlock()

	u.db.DeleteUserSessionsExpireAfter(context.Background(), time.Now())
}

func (u *UserRegistry) ClearExpiredSessionsOncePerHour() bool {

	if time.Hour > time.Since(u.lastClearTime) {
		u.ClearExpiredSessions()
		return true
	}
	return false
}
