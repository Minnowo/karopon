package database_test

import (
	"database/sql"
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testUserSessionLifecycle(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)
	token := make([]byte, 32)
	session := &database.TblUserSession{
		UserID:  userID,
		Token:   token,
		Expires: database.TimeMillis(time.Now().Add(time.Hour)),
	}

	require.NoError(t, db.AddUserSession(ctx, session))

	var loaded database.TblUserSession
	require.NoError(t, db.LoadUserSession(ctx, token, &loaded))
	session.Created = loaded.Created
	// check the miliseconds match
	assert.Equal(t, session.Expires.Time().UnixMilli(), loaded.Expires.Time().UnixMilli())
	// the check for equal used by assert doesn't match these times,
	// something internally in the time struct is different, even though the miliseconds match.
	session.Expires = loaded.Expires
	assert.Equal(t, session, &loaded)

	require.NoError(t, db.DeleteUserSessionByToken(ctx, token))

	err := db.LoadUserSession(ctx, token, &loaded)
	require.Error(t, err)
	assert.ErrorIs(t, err, sql.ErrNoRows)
}

func testLoadUserSessions(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	token1 := make([]byte, 32)
	token1[0] = 1
	token2 := make([]byte, 32)
	token2[0] = 2

	require.NoError(t, db.AddUserSession(ctx, &database.TblUserSession{
		UserID:  userID,
		Token:   token1,
		Expires: database.TimeMillis(time.Now().Add(time.Hour)),
	}))
	require.NoError(t, db.AddUserSession(ctx, &database.TblUserSession{
		UserID:  userID,
		Token:   token2,
		Expires: database.TimeMillis(time.Now().Add(2 * time.Hour)),
	}))

	var sessions []database.TblUserSession
	require.NoError(t, db.LoadUserSessions(ctx, userID, &sessions))
	assert.Len(t, sessions, 2)
}

func testDeleteUserSessionsExpireAfter(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	expiredToken := make([]byte, 32)
	expiredToken[0] = 1
	validToken := make([]byte, 32)
	validToken[0] = 2

	require.NoError(t, db.AddUserSession(ctx, &database.TblUserSession{
		UserID:  userID,
		Token:   expiredToken,
		Expires: database.TimeMillis(time.Now().Add(-time.Hour)),
	}))
	require.NoError(t, db.AddUserSession(ctx, &database.TblUserSession{
		UserID:  userID,
		Token:   validToken,
		Expires: database.TimeMillis(time.Now().Add(time.Hour)),
	}))

	require.NoError(t, db.DeleteUserSessionsExpireAfter(ctx, time.Now()))

	var sessions []database.TblUserSession
	require.NoError(t, db.LoadUserSessions(ctx, userID, &sessions))
	assert.Len(t, sessions, 1)
	assert.Equal(t, validToken, sessions[0].Token)
}

func testUpdateUserSessionUserAgent(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	token := make([]byte, 32)
	token[0] = 1

	require.NoError(t, db.AddUserSession(ctx, &database.TblUserSession{
		UserID:    userID,
		Token:     token,
		Expires:   database.TimeMillis(time.Now().Add(time.Hour)),
		UserAgent: "Mozilla/5.0",
	}))

	// rename the session
	require.NoError(t, db.UpdateUserSessionUserAgent(ctx, userID, token, "My Laptop"))

	var sessions []database.TblUserSession
	require.NoError(t, db.LoadUserSessions(ctx, userID, &sessions))
	require.Len(t, sessions, 1)
	assert.Equal(t, "My Laptop", sessions[0].UserAgent)

	// updating with a different user_id should not affect the session
	otherToken := make([]byte, 32)
	otherToken[0] = 2
	require.NoError(t, db.UpdateUserSessionUserAgent(ctx, userID+99, token, "Hijacked"))

	sessions = sessions[:0]
	require.NoError(t, db.LoadUserSessions(ctx, userID, &sessions))
	require.Len(t, sessions, 1)
	assert.Equal(t, "My Laptop", sessions[0].UserAgent, "session should be unchanged after wrong-user update")
}
