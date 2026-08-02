package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

func testEventAndEventlog(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	event := &database.TblUserEvent{
		UserID: userID,
		Name:   "Dinner",
	}

	eventID, err := db.AddUserEvent(ctx, event)
	require.NoError(t, err)

	var loaded database.TblUserEvent
	require.NoError(t, db.LoadUserEvent(ctx, userID, eventID, &loaded))
	assert.Equal(t, "Dinner", loaded.Name)

	log := &database.TblUserEventLog{
		UserID:  userID,
		EventID: eventID,
	}

	logID, err := db.AddUserEventLogWith(ctx, log, nil)
	require.NoError(t, err)
	require.NotZero(t, logID)

	var logs []database.TblUserEventLog
	require.NoError(t, db.LoadUserEventLogs(ctx, userID, &logs))
	assert.Len(t, logs, 1)

	foodlog := &database.TblUserFoodLog{
		UserID:     userID,
		EventLogID: logID,
		Name:       "Toast",
		Event:      event.Name,
		Unit:       "g",
		Portion:    50,
		Protein:    4,
		Carb:       15,
		Fat:        2,
	}
	var id int
	require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var err error
		id, err = db.AddUserFoodLogTx(tx, foodlog)

		return err
	}))
	require.NotZero(t, id)

	var eventlogwithfood database.UserEventFoodLog
	require.NoError(t, db.LoadUserEventFoodLog(ctx, userID, logID, &eventlogwithfood))
	assert.Len(t, eventlogwithfood.Foodlogs, 1)
	assert.Equal(t, id, eventlogwithfood.Eventlog.ID)
	assert.Equal(t, foodlog.Name, eventlogwithfood.Foodlogs[0].Name)
}

func testAddUserEventLogTx(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Dinner"})
	require.NoError(t, err)

	var logID int
	require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var err error
		logID, err = db.AddUserEventLogTx(tx, &database.TblUserEventLog{
			UserID:  userID,
			EventID: eventID,
		})

		return err
	}))
	require.NotZero(t, logID)

	var logs []database.TblUserEventLog
	require.NoError(t, db.LoadUserEventLogs(ctx, userID, &logs))
	assert.Len(t, logs, 1)
	assert.Equal(t, logID, logs[0].ID)
}

func testLoadUserEventLogsTx(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Lunch"})
	require.NoError(t, err)

	_, err = db.AddUserEventLogWith(ctx, &database.TblUserEventLog{UserID: userID, EventID: eventID}, nil)
	require.NoError(t, err)

	var logs []database.TblUserEventLog
	require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return db.LoadUserEventLogsTx(tx, userID, &logs)
	}))
	assert.Len(t, logs, 1)
}

func testDeleteUserEventLog(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Dinner"})
	require.NoError(t, err)

	logID, err := db.AddUserEventLogWith(ctx, &database.TblUserEventLog{UserID: userID, EventID: eventID}, nil)
	require.NoError(t, err)

	require.NoError(t, db.DeleteUserEventLog(ctx, userID, logID))

	var logs []database.TblUserEventLog
	require.NoError(t, db.LoadUserEventLogs(ctx, userID, &logs))
	assert.Empty(t, logs)
}

func testLoadUserEventFoodLog(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Breakfast"})
	require.NoError(t, err)

	foodlog := database.TblUserFoodLog{
		UserID:  userID,
		Name:    "Egg",
		Unit:    "g",
		Portion: 100,
		Protein: 13,
		Carb:    1,
		Fat:     11,
	}
	logID, err := db.AddUserEventLogWith(
		ctx,
		&database.TblUserEventLog{UserID: userID, EventID: eventID},
		[]database.TblUserFoodLog{foodlog},
	)
	require.NoError(t, err)

	var eflog database.UserEventFoodLog
	require.NoError(t, db.LoadUserEventFoodLog(ctx, userID, logID, &eflog))
	assert.Equal(t, logID, eflog.Eventlog.ID)
	require.Len(t, eflog.Foodlogs, 1)
	assert.Equal(t, "Egg", eflog.Foodlogs[0].Name)
}

func testLoadUserEventFoodLogs(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Lunch"})
	require.NoError(t, err)

	for range 2 {
		_, err = db.AddUserEventLogWith(ctx, &database.TblUserEventLog{UserID: userID, EventID: eventID}, nil)
		require.NoError(t, err)
	}

	var eflogs []database.UserEventFoodLog
	require.NoError(t, db.LoadUserEventFoodLogs(ctx, userID, &eflogs))
	assert.Len(t, eflogs, 2)
}

func testLoadUserEventFoodLogsN(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Snack"})
	require.NoError(t, err)

	for range 3 {
		_, err = db.AddUserEventLogWith(ctx, &database.TblUserEventLog{UserID: userID, EventID: eventID}, nil)
		require.NoError(t, err)
	}

	var eflogs []database.UserEventFoodLog
	require.NoError(t, db.LoadUserEventFoodLogsN(ctx, userID, 2, &eflogs))
	assert.Len(t, eflogs, 2)
}

func testUpdateUserEventFoodLog(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Dinner"})
	require.NoError(t, err)

	initialFood := database.TblUserFoodLog{
		UserID:  userID,
		Name:    "Egg",
		Unit:    "g",
		Portion: 100,
		Protein: 13,
		Carb:    1,
		Fat:     11,
	}
	eventlog := &database.TblUserEventLog{UserID: userID, EventID: eventID, Event: "Dinner"}
	logID, err := db.AddUserEventLogWith(ctx, eventlog, []database.TblUserFoodLog{initialFood})
	require.NoError(t, err)

	updatedFood := database.TblUserFoodLog{
		UserID:  userID,
		Name:    "Milk",
		Unit:    "ml",
		Portion: 200,
		Protein: 7,
		Carb:    10,
		Fat:     8,
	}
	eventlog.ID = logID
	require.NoError(t, db.UpdateUserEventFoodLog(ctx, &database.UpdateUserEventLog{
		Eventlog: *eventlog,
		Foodlogs: []database.TblUserFoodLog{updatedFood},
	}))

	var eflog database.UserEventFoodLog
	require.NoError(t, db.LoadUserEventFoodLog(ctx, userID, logID, &eflog))
	require.Len(t, eflog.Foodlogs, 1)
	assert.Equal(t, "Milk", eflog.Foodlogs[0].Name)
}
