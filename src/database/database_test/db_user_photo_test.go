package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

func testUserPhotoAdd(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	photo := &database.TblUserPhoto{
		UserID: userID,
		Data:   []byte{0x89, 0x50, 0x4E, 0x47},
	}

	id, err := db.AddUserPhoto(ctx, photo)
	require.NoError(t, err)
	require.NotZero(t, id)
}

func testUserEventlogPhotoMapping(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	event := &database.TblUserEvent{UserID: userID, Name: "Lunch"}
	eventID, err := db.AddUserEvent(ctx, event)
	require.NoError(t, err)
	event.ID = eventID

	eventlog := &database.TblUserEventLog{
		UserID:  userID,
		EventID: eventID,
		Event:   event.Name,
	}
	logID, err := db.AddUserEventLogWith(ctx, eventlog, nil)
	require.NoError(t, err)
	require.NotZero(t, logID)

	photo1 := &database.TblUserPhoto{UserID: userID, Data: []byte{0x01}}
	photo2 := &database.TblUserPhoto{UserID: userID, Data: []byte{0x02}}

	id1, err := db.AddUserPhoto(ctx, photo1)
	require.NoError(t, err)
	id2, err := db.AddUserPhoto(ctx, photo2)
	require.NoError(t, err)

	require.NoError(t, db.AddUserEventLogPhotos(ctx, logID, []int{id1, id2}))

	// Duplicate insert must fail (primary key violation).
	err = db.AddUserEventLogPhotos(ctx, logID, []int{id1})
	require.Error(t, err)
}
