package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

func testLoadUserEventByName(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Breakfast"})
	require.NoError(t, err)

	var loaded database.TblUserEvent
	require.NoError(t, db.LoadUserEventByName(ctx, userID, "Breakfast", &loaded))
	assert.Equal(t, eventID, loaded.ID)
	assert.Equal(t, "Breakfast", loaded.Name)
}

func testLoadUserEvents(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	for _, name := range []string{"Breakfast", "Lunch", "Dinner"} {
		_, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: name})
		require.NoError(t, err)
	}

	var events []database.TblUserEvent
	require.NoError(t, db.LoadUserEvents(ctx, userID, &events))
	assert.Len(t, events, 3)
}

func testLoadAndOrCreateUserEventByNameTx(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	// First call creates the event.
	var created database.TblUserEvent
	require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return db.LoadAndOrCreateUserEventByNameTx(tx, userID, "Breakfast", &created)
	}))
	assert.NotZero(t, created.ID)
	assert.Equal(t, "Breakfast", created.Name)

	// Second call loads the existing event without creating a duplicate.
	var loaded database.TblUserEvent
	require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return db.LoadAndOrCreateUserEventByNameTx(tx, userID, "Breakfast", &loaded)
	}))
	assert.Equal(t, created.ID, loaded.ID)

	var events []database.TblUserEvent
	require.NoError(t, db.LoadUserEvents(ctx, userID, &events))
	assert.Len(t, events, 1)
}
