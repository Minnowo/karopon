package user

import (
	"context"
	"karopon/src/database"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type UserRegistry struct {
	users     map[string]*database.TblUser
	usersLock sync.RWMutex

	sessions     map[AccessToken]Session
	sessionsLock sync.RWMutex
}

func NewRegistry() *UserRegistry {
	return &UserRegistry{
		users:    make(map[string]*database.TblUser),
		sessions: make(map[AccessToken]Session),
	}
}

func (u *UserRegistry) NewToken(user *database.TblUser) AccessToken {

	var token AccessToken
	token.New()

	u.sessionsLock.Lock()
	defer u.sessionsLock.Unlock()

	for {
		_, ok := u.sessions[token]

		if !ok {
			break
		}

		token.New()
	}

	u.sessions[token] = Session{
		user:    user,
		expires: time.Now().Add(time.Hour * time.Duration(24)),
	}

	return token
}

func (u *UserRegistry) ExpireToken(tokenStr string) {

	var token AccessToken

	if err := token.FromString(tokenStr); err != nil {
		return
	}

	u.sessionsLock.Lock()
	delete(u.sessions, token)
	u.sessionsLock.Unlock()
}

func (u *UserRegistry) CheckToken(tokenStr string) (*database.TblUser, bool) {

	var token AccessToken

	if err := token.FromString(tokenStr); err != nil {
		return nil, false
	}

	u.sessionsLock.RLock()
	session, ok := u.sessions[token]

	if !ok {
		u.sessionsLock.RUnlock()
		return nil, false
	}

	expired := session.Expired()

	log.Debug().Bool("expired", expired).Msg("session expire check")
	if expired {
		u.sessionsLock.RUnlock()
		u.sessionsLock.Lock()
		delete(u.sessions, token)
		u.sessionsLock.Unlock()
		return nil, false
	} else {
		defer u.sessionsLock.RUnlock()
	}

	userCopy := *session.user

	return &userCopy, true
}

func (u *UserRegistry) HasUser(name string) bool {

	u.usersLock.RLock()
	defer u.usersLock.RUnlock()

	_, ok := u.users[name]

	return ok
}

func (u *UserRegistry) Login(name, password string) (string, bool) {

	u.usersLock.RLock()
	user, ok := u.users[name]
	u.usersLock.RUnlock()

	if !ok {
		return "", false
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))

	if err != nil {

		if err != bcrypt.ErrMismatchedHashAndPassword {
			log.Warn().Err(err).Msg("")
		}

		return "", false
	}

	token := u.NewToken(user)

	return token.String(), true
}

func (u *UserRegistry) AddUser(user database.TblUser) {

	u.usersLock.Lock()

	existingUser, ok := u.users[user.Name]

	if ok {
		// we need to lock here because a session could be copying the data from the user pointer in CheckToken
		u.sessionsLock.Lock()
		*existingUser = user
		u.sessionsLock.Unlock()
	} else {
		u.users[user.Name] = &user
	}

	u.usersLock.Unlock()
}

func (u *UserRegistry) LoadFromDatabase(db database.DB) error {

	var users []database.TblUser

	err := db.LoadUsers(context.Background(), &users)

	if err != nil {
		return err
	}

	for _, user := range users {

		if user.Name == "" {
			log.Warn().Msg("skipping user with empty name")
			continue
		}

		cost, err := bcrypt.Cost(user.Password)

		if err != nil {
			log.Warn().Str("user", user.Name).Msg("skipping user whos password is invalid")
			continue
		}

		log.Info().Str("user", user.Name).Int("cost", cost).Msg("registering user")

		u.AddUser(user)
	}

	return nil
}
