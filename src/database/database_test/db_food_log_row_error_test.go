// A food row that cannot be saved (a new food with a zero portion) must be
// reported with its index in the rows given, from both create and update, so
// the API can point at the row.

package database_test

import (
	"errors"
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testFoodLogRowError(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	_, err := db.AddUserFood(ctx, &database.TblUserFood{UserID: userID, Name: "Rice", Unit: "g", Portion: 1, Carb: 1})
	require.NoError(t, err)

	eventID, err := db.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Lunch"})
	require.NoError(t, err)

	rows := func() []database.TblUserFoodLog {
		return []database.TblUserFoodLog{
			// A zero portion of a saved food is allowed.
			{Name: "Rice", Unit: "g", Portion: 0},
			// A food the user has not saved is rejected; foods are made on
			// the foods page, never by an event.
			{Name: "Brand New Food", Unit: "g", Portion: 1},
		}
	}

	var rowErr *database.FoodLogRowError

	log := &database.TblUserEventLog{UserID: userID, EventID: eventID, Event: "Lunch"}
	_, err = db.AddUserEventLogWith(ctx, log, rows())
	require.ErrorAs(t, err, &rowErr, "create")
	assert.Equal(t, 1, rowErr.Index)
	assert.ErrorIs(t, err, database.ErrFoodNotFound)

	// The known food alone saves fine, and gives an event log to update.
	logID, err := db.AddUserEventLogWith(ctx, log, rows()[:1])
	require.NoError(t, err)

	update := &database.UpdateUserEventLog{
		Eventlog: database.TblUserEventLog{ID: logID, UserID: userID, EventID: eventID, Event: "Lunch"},
		Foodlogs: rows(),
	}
	rowErr = nil
	err = db.UpdateUserEventFoodLog(ctx, update)
	require.True(t, errors.As(err, &rowErr), "update: %v", err)
	assert.Equal(t, 1, rowErr.Index)
}
