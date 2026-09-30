package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testUserCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	user := &database.TblUser{
		Name:                     "alice",
		Password:                 []byte{1, 2, 3},
		Theme:                    "auto",
		ShowDiabetes:             true,
		CaloricCalcMethod:        "auto",
		InsulinSensitivityFactor: 5,
		EventHistoryFetchLimit:   50,
		TargetBloodSugar:         7,
		SessionExpireTimeSeconds: 500,
		TimeFormat:               "auto",
		DateFormat:               "auto",
		CustomCSS:                "body { color: red; }",
		MiscSettings:             `{"a":1}`,
	}

	// test the username is not taken
	taken, err := db.UsernameTaken(ctx, 0, user.Name)
	require.NoError(t, err)
	assert.False(t, taken)

	// test insert
	id, err := db.AddUser(ctx, user)
	require.NoError(t, err)
	require.NotZero(t, id)

	// check the username is now taken
	taken, err = db.UsernameTaken(ctx, 0, user.Name)
	require.NoError(t, err)
	assert.True(t, taken)

	// test we can load the user back and it's data matches
	var loaded database.TblUser
	require.NoError(t, db.LoadUserByID(ctx, id, &loaded))

	user.ID = loaded.ID
	user.Created = loaded.Created
	assert.Equal(t, user, &loaded)

	// test update
	loaded.Name = "alice2"
	loaded.Password = []byte{4, 5, 6}
	loaded.Theme = "dark-1"
	loaded.ShowDiabetes = false
	loaded.CaloricCalcMethod = "something_else"
	loaded.InsulinSensitivityFactor = 9
	loaded.EventHistoryFetchLimit = 10
	loaded.TargetBloodSugar = 10
	loaded.SessionExpireTimeSeconds = 100
	loaded.TimeFormat = "auto2"
	loaded.DateFormat = "auto2"
	loaded.CustomCSS = ""
	loaded.MiscSettings = `{"b":[1,2]}`
	require.NoError(t, db.UpdateUser(ctx, &loaded))

	// check the new username was taken
	taken, err = db.UsernameTaken(ctx, 0, loaded.Name)
	require.NoError(t, err)
	assert.True(t, taken)

	// check the old username is now available
	taken, err = db.UsernameTaken(ctx, 0, user.Name)
	require.NoError(t, err)
	assert.False(t, taken)

	// load into 'user' and check that it matches the updated 'loaded'
	require.NoError(t, db.LoadUserByID(ctx, id, user))
	assert.Equal(t, &loaded, user)
}

func testHasAnyUser(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	has, err := db.HasAnyUser(ctx)
	require.NoError(t, err)
	assert.False(t, has)

	getTestUser(t, db)

	has, err = db.HasAnyUser(ctx)
	require.NoError(t, err)
	assert.True(t, has)
}

func testLoadUser(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	user := &database.TblUser{
		Name:     "alice",
		Password: []byte{1, 2, 3},
	}
	id, err := db.AddUser(ctx, user)
	require.NoError(t, err)

	var loaded database.TblUser
	require.NoError(t, db.LoadUser(ctx, "alice", &loaded))
	assert.Equal(t, id, loaded.ID)
	assert.Equal(t, "alice", loaded.Name)
}
