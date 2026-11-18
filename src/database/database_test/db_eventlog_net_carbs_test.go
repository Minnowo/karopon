// Updating an event log must store the net carbs of all its food rows, the
// same as creating it does.

package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testEventLogUpdateNetCarbs(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Lunch"})
	require.NoError(t, err)

	rows := []database.TblUserFoodLog{
		{Name: "Rice", Unit: "g", Portion: 1, Carb: 30, Fibre: 2},
		{Name: "Beans", Unit: "g", Portion: 1, Carb: 20, Fibre: 8},
	}

	log := &database.TblUserEventLog{UserID: userID, EventID: eventID, Event: "Lunch"}
	logID, err := db.AddUserEventLogWith(ctx, log, rows)
	require.NoError(t, err)

	var loaded database.UserEventFoodLog
	require.NoError(t, db.LoadUserEventFoodLog(ctx, userID, logID, &loaded))
	assert.InDelta(t, 40, loaded.Eventlog.NetCarbs, 0.001, "after create")

	update := &database.UpdateUserEventLog{
		Eventlog: database.TblUserEventLog{ID: logID, UserID: userID, EventID: eventID, Event: "Lunch"},
		Foodlogs: rows,
	}
	require.NoError(t, db.UpdateUserEventFoodLog(ctx, update))

	require.NoError(t, db.LoadUserEventFoodLog(ctx, userID, logID, &loaded))
	assert.InDelta(t, 40, loaded.Eventlog.NetCarbs, 0.001, "after update")
}
