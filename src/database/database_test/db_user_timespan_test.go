package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testAddUserTimespan(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	// Prepare timespan data
	note := "Test timespan"
	ts := &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}

	tags := []database.TblUserTag{
		{UserID: userID, Namespace: "food", Name: "Egg"},
	}

	// Step 1: Add the timespan with tags
	timespanID, err := db.AddUserTimespan(ctx, ts, tags)
	require.NoError(t, err)

	// Step 2: Verify that the timespan was inserted
	var loadedTimespans []database.TblUserTimespan
	err = db.LoadUserTimespans(ctx, userID, &loadedTimespans)
	require.NoError(t, err)
	assert.Len(t, loadedTimespans, 1)
	assert.Equal(t, timespanID, loadedTimespans[0].ID)
	assert.NotNil(t, loadedTimespans[0].Note)
	assert.Equal(t, note, *loadedTimespans[0].Note)
	assert.Equal(t, ts.StartTime.Time().UnixMilli(), loadedTimespans[0].StartTime.Time().UnixMilli())
	assert.Equal(t, ts.StopTime.Time().UnixMilli(), loadedTimespans[0].StopTime.Time().UnixMilli())

	// Verify that the tags were also inserted and associated
	var loadedTags []database.TblUserTag
	err = db.LoadUserTags(ctx, userID, &loadedTags)
	require.NoError(t, err)
	tags[0].ID = loadedTags[0].ID
	tags[0].Created = loadedTags[0].Created
	assert.Equal(t, tags[0], loadedTags[0])
}

func testDeleteUserTimespan(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	note := "test"
	tsID, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}, nil)
	require.NoError(t, err)

	require.NoError(t, db.DeleteUserTimespan(ctx, userID, tsID))

	var timespans []database.TblUserTimespan
	require.NoError(t, db.LoadUserTimespans(ctx, userID, &timespans))
	assert.Empty(t, timespans)
}

func testUpdateUserTimespan(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	note := "original"
	ts := &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}
	tsID, err := db.AddUserTimespan(ctx, ts, nil)
	require.NoError(t, err)

	updatedNote := "updated"
	ts.ID = tsID
	ts.Note = &updatedNote
	require.NoError(t, db.UpdateUserTimespan(ctx, ts))

	var timespans []database.TblUserTimespan
	require.NoError(t, db.LoadUserTimespans(ctx, userID, &timespans))
	require.Len(t, timespans, 1)
	assert.Equal(t, "updated", *timespans[0].Note)
}

func testLoadUserTimespansN(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	for range 3 {
		_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
			UserID:    userID,
			StartTime: database.TimeMillis(time.Now()),
			StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		}, nil)
		require.NoError(t, err)
	}

	var timespans []database.TblUserTimespan
	require.NoError(t, db.LoadUserTimespansN(ctx, userID, 2, &timespans))
	assert.Len(t, timespans, 2)
}

func testLoadUserTimespansWithTags(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	note := "with tags"
	_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "food", Name: "Egg"},
	})
	require.NoError(t, err)

	var tagged []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &tagged))
	require.Len(t, tagged, 1)
	require.Len(t, tagged[0].Tags, 1)
	assert.Equal(t, userID, tagged[0].Timespan.UserID)
	assert.Equal(t, note, *tagged[0].Timespan.Note)
	assert.Equal(t, "Egg", tagged[0].Tags[0].Name)
	assert.Equal(t, "food", tagged[0].Tags[0].Namespace)
}

func testLoadUserTimespansWithTagsN(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	for range 3 {
		_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
			UserID:    userID,
			StartTime: database.TimeMillis(time.Now()),
			StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		}, nil)
		require.NoError(t, err)
	}

	var tagged []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTagsN(ctx, userID, 2, &tagged))
	assert.Len(t, tagged, 2)
}

func testLoadUserTimespansWithTagsPermissionCheck(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	note := "with tags"
	_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "food", Name: "Egg"},
	})
	require.NoError(t, err)

	// Add a second timespan on a different user.
	// The bug fixed was that LoadUserTimespansWithTags would load timespans from ALL users.
	userID2 := getTestUser2(t, db)
	_, err = db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID2,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "food", Name: "Egg"},
	})
	require.NoError(t, err)

	var tagged []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &tagged))
	require.Len(t, tagged, 1)
	require.Len(t, tagged[0].Tags, 1)
	assert.Equal(t, userID, tagged[0].Timespan.UserID)
	assert.Equal(t, note, *tagged[0].Timespan.Note)
	assert.Equal(t, "Egg", tagged[0].Tags[0].Name)
	assert.Equal(t, "food", tagged[0].Tags[0].Namespace)
}

func testSetUserTimespanTags(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	note := "timespan"
	tsID, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		Note:      &note,
	}, nil)
	require.NoError(t, err)

	newTags := []database.TblUserTag{
		{UserID: userID, Namespace: "food", Name: "Egg"},
		{UserID: userID, Namespace: "food", Name: "Milk"},
	}
	require.NoError(t, db.SetUserTimespanTags(ctx, userID, tsID, newTags))

	var tagged []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &tagged))
	require.Len(t, tagged, 1)
	assert.Len(t, tagged[0].Tags, 2)
}

func testDeleteTagUsedByTimespan(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(time.Now()),
		StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
	}, []database.TblUserTag{{Namespace: "workout", Name: "day1"}, {Namespace: "workout", Name: "legs"}})
	require.NoError(t, err)

	require.NoError(t, db.DeleteUserTag(ctx, userID, "workout", "day1"))

	var spans []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &spans))
	require.Len(t, spans, 1)
	assert.Equal(t, []string{"workout:legs"}, tagNames(spans[0].Tags))
}
