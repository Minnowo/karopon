package userreg

import (
	"context"
	"errors"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

// Mock db.
var errNotFound = errors.New("not found")

type sessionMockDB struct {
	mock_db.BaseMockDB
	mu       sync.Mutex
	sessions map[string]*database.TblUserSession
	user     *database.TblUser
}

func newSessionMock(user *database.TblUser) *sessionMockDB {
	return &sessionMockDB{
		sessions: make(map[string]*database.TblUserSession),
		user:     user,
	}
}

func (m *sessionMockDB) AddUserSession(ctx context.Context, s *database.TblUserSession) error {

	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[string(s.Token)] = s

	return nil
}

func (m *sessionMockDB) LoadUserSession(ctx context.Context, token []byte, out *database.TblUserSession) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	s, ok := m.sessions[string(token)]
	if !ok {
		return errNotFound
	}

	*out = *s

	return nil
}

func (m *sessionMockDB) DeleteUserSessionByToken(ctx context.Context, token []byte) error {

	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, string(token))

	return nil
}

func (m *sessionMockDB) DeleteUserSessionsExpireAfter(ctx context.Context, t time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for k, v := range m.sessions {
		if v.Expires.Time().Before(t) {
			delete(m.sessions, k)
		}
	}

	return nil
}

func (m *sessionMockDB) LoadUser(ctx context.Context, username string, out *database.TblUser) error {

	if m.user == nil {
		return errNotFound
	}
	*out = *m.user

	return nil
}

func (m *sessionMockDB) LoadUserByID(ctx context.Context, id int, out *database.TblUser) error {

	if m.user == nil {
		return errNotFound
	}
	*out = *m.user

	return nil
}

// Mock db end.

func TestLoginSuccessInMemoryCache(t *testing.T) {

	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	user := &database.TblUser{
		ID:                       1,
		Name:                     "alice",
		Password:                 hash,
		SessionExpireTimeSeconds: 120,
	}

	mock := newSessionMock(nil)
	reg := NewRegistry(mock)
	reg.usersByName[user.Name] = user
	reg.usersByID[user.ID] = user

	token, expires, err := reg.Login(context.Background(), "alice", "secret")

	assert.Nil(t, err, "expected nil error")
	assert.NotEmpty(t, token, "expected token")

	if expires.Before(time.Now()) {
		t.Fatal("expected future expiration")
	}
}

func TestLoginSuccessNoMemoryCache(t *testing.T) {

	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)

	mock := newSessionMock(&database.TblUser{
		ID:                       1,
		Name:                     "alice",
		Password:                 hash,
		SessionExpireTimeSeconds: 120,
	})

	reg := NewRegistry(mock)

	token, expires, err := reg.Login(context.Background(), "alice", "secret")

	assert.Nil(t, err, "expected nil error")
	assert.NotEmpty(t, token, "expected token")

	if expires.Before(time.Now()) {
		t.Fatal("expected future expiration")
	}

	assert.NotEmpty(t, reg.usersByID, "expected user to be in memory cache after login")
	assert.NotEmpty(t, reg.usersByName, "expected user to be in memory cache after login")
}

func TestLoginWrongPassword(t *testing.T) {

	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)

	mock := newSessionMock(&database.TblUser{
		ID:                       1,
		Name:                     "alice",
		Password:                 hash,
		SessionExpireTimeSeconds: 120,
	})

	reg := NewRegistry(mock)

	_, _, err := reg.Login(context.Background(), "alice", "wrong")

	if !errors.Is(err, ErrUserPasswordDoesNotMatch) {
		t.Fatalf("expected ErrUserPasswordDoesNotMatch, got %v", err)
	}
}

func TestLoginUserNotFound(t *testing.T) {

	reg := NewRegistry(&sessionMockDB{})

	_, _, err := reg.Login(context.Background(), "ghost", "pw")

	if !errors.Is(err, ErrUserDoesNotExist) {
		t.Fatalf("expected ErrUserDoesNotExist, got %v", err)
	}
}

func TestCheckTokenDatabaseGet(t *testing.T) {

	var token AccessToken
	token.New()

	mock := newSessionMock(&database.TblUser{ID: 1})
	reg := NewRegistry(mock)
	reg.sessions[token.Hash()] = Session{
		userID:  1,
		expires: time.Now().Add(time.Hour),
	}

	u, ok := reg.CheckToken(context.Background(), token.String())

	assert.True(t, ok, "expected valid token")
	assert.Equal(t, 1, u.ID, "expected matching user id")
	assert.NotEmpty(t, reg.usersByID, "expected user to be in memory cache after check token")
	assert.NotEmpty(t, reg.usersByName, "expected user to be in memory cache after check token")
}

func TestCheckTokenMemoryHit(t *testing.T) {

	var token AccessToken
	token.New()

	mock := newSessionMock(nil)
	reg := NewRegistry(mock)
	reg.usersByID[1] = &database.TblUser{ID: 1}
	reg.usersByName[""] = &database.TblUser{ID: 1}
	reg.sessions[token.Hash()] = Session{
		userID:  1,
		expires: time.Now().Add(time.Hour),
	}

	u, ok := reg.CheckToken(context.Background(), token.String())

	assert.True(t, ok, "expected valid token")
	assert.Equal(t, 1, u.ID, "expected matching user id")
}

func TestExpireToken(t *testing.T) {

	var token AccessToken
	token.New()

	mock := newSessionMock(&database.TblUser{ID: 1})
	mock.sessions[string(token.HashBytes())] = &database.TblUserSession{
		UserID: 1,
		Token:  token.HashBytes(),
	}

	reg := NewRegistry(mock)
	reg.sessions[token.Hash()] = Session{}

	reg.ExpireToken(token.String())

	_, ok := reg.CheckToken(context.Background(), token.String())

	assert.False(t, ok, "expected token to be expired")
	assert.Empty(t, reg.sessions, "expected registry sessions to be empty")
	assert.Empty(t, mock.sessions, "expected sessions db table to be empty")
}

func TestClearExpiredSessions(t *testing.T) {

	mock := newSessionMock(nil)
	reg := NewRegistry(mock)

	hash := AccessTokenHash{9, 9, 9}

	reg.sessions[hash] = Session{
		userID:  1,
		expires: time.Now().Add(-time.Hour),
	}

	reg.ClearExpiredSessions()
	assert.Empty(t, reg.sessions, "expected expired session removed")
}

func TestPutUserWithNewName(t *testing.T) {
	reg := NewRegistry(&mock_db.BaseMockDB{})

	user := &database.TblUser{
		ID:   10,
		Name: "newname",
	}

	reg.usersByName["oldname"] = user
	reg.usersByID[10] = user

	reg.PutUserWithNewName("oldname", user)

	if _, ok := reg.usersByName["oldname"]; ok {
		t.Fatal("old name should be removed")
	}

	if _, ok := reg.usersByName["newname"]; !ok {
		t.Fatal("new name should exist")
	}
}
