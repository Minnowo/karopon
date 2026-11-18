// Tests for creating and updating event logs: food rows are trimmed before
// saving, and every problem with the event name or a food row is reported at
// once, pointing at the row.

package v1

import (
	"context"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateEventLogTrimsFoodRows(t *testing.T) {

	db := &eventLogMockDB{}
	rr := sendAsUser(
		t,
		db.newHandler(),
		`{"event":{"name":"Lunch"},"foods":[{"name":" Rice ","unit":" g ","portion":1}]}`,
	)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	require.Len(t, db.savedFoods, 1)
	assert.Equal(t, "Rice", db.savedFoods[0].Name)
	assert.Equal(t, "g", db.savedFoods[0].Unit)
}

func TestUpdateEventLogTrimsFoodRows(t *testing.T) {

	db := &eventLogMockDB{}
	rr := sendAsUser(t, db.updateHandler(),
		`{"eventlog":{"id":4,"event":"Lunch"},"foodlogs":[{"name":" Rice ","unit":" g ","portion":1}]}`)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	require.Len(t, db.savedFoods, 1)
	assert.Equal(t, "Rice", db.savedFoods[0].Name)
	assert.Equal(t, "g", db.savedFoods[0].Unit)
}

func TestCreateEventLogReportsEveryProblem(t *testing.T) {

	db := &eventLogMockDB{}
	rr := sendAsUser(
		t,
		db.newHandler(),
		`{"event":{"name":" "},"foods":[{"name":"Rice","unit":"g","portion":1},{"name":"Beans","unit":"g","portion":-1},`+
			`{"name":" ","unit":"g","portion":2}]}`,
	)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/event/name", "#/foods/1/portion", "#/foods/2/name"}, problemPointers(t, rr))
	assert.Nil(t, db.savedFoods, "nothing may be saved when validation fails")
}

func TestUpdateEventLogReportsEveryProblem(t *testing.T) {

	db := &eventLogMockDB{}
	rr := sendAsUser(t, db.updateHandler(),
		`{"eventlog":{"id":4,"event":""},"foodlogs":[{"name":"Rice","unit":"g","portion":-1}]}`)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/eventlog/event", "#/foodlogs/0/portion"}, problemPointers(t, rr))
	assert.Nil(t, db.savedFoods, "nothing may be saved when validation fails")
}

func TestEventLogZeroPortionIsLeftToTheDatabase(t *testing.T) {

	db := &eventLogMockDB{}
	rr := sendAsUser(t, db.newHandler(), `{"event":{"name":"Lunch"},"foods":[{"name":"Rice","unit":"g","portion":0}]}`)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	require.Len(t, db.savedFoods, 1)
}

func TestEventLogRowErrorPointsAtTheRow(t *testing.T) {

	rowErr := &database.FoodLogRowError{Index: 1, Err: database.ErrFoodPortionIsZero}

	db := &eventLogMockDB{rowErr: rowErr}
	rr := sendAsUser(
		t,
		db.newHandler(),
		`{"event":{"name":"Lunch"},"foods":[{"name":"Rice","unit":"g","portion":1},{"name":"New","unit":"g","portion":0}]}`,
	)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/foods/1/portion"}, problemPointers(t, rr))

	db = &eventLogMockDB{rowErr: rowErr}
	rr = sendAsUser(t, db.updateHandler(),
		`{"eventlog":{"id":4,"event":"Lunch"},"foodlogs":[{"name":"Rice","unit":"g","portion":1},`+
			`{"name":"New","unit":"g","portion":0}]}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/foodlogs/1/portion"}, problemPointers(t, rr))
}

// eventLogMockDB keeps the food rows it was asked to save.
type eventLogMockDB struct {
	mock_db.BaseMockDB

	savedFoods []database.TblUserFoodLog
	rowErr     error
}

func (m *eventLogMockDB) newHandler() http.HandlerFunc {
	return newTestAPI(m).createUserEvent
}

func (m *eventLogMockDB) updateHandler() http.HandlerFunc {
	return newTestAPI(m).updateUserEventFoodLog
}

func (m *eventLogMockDB) LoadUserEventByName(
	ctx context.Context, userID int, name string, event *database.TblUserEvent,
) error {
	event.ID = 1

	return nil
}

func (m *eventLogMockDB) AddUserEventLogWith(
	ctx context.Context, event *database.TblUserEventLog, foodlogs []database.TblUserFoodLog,
) (int, error) {
	if m.rowErr != nil {
		return 0, m.rowErr
	}
	m.savedFoods = foodlogs

	return 4, nil
}

func (m *eventLogMockDB) LoadUserEventFoodLog(
	ctx context.Context, userID int, eventlogID int, eflog *database.UserEventFoodLog,
) error {
	return nil
}

func (m *eventLogMockDB) UpdateUserEventFoodLog(ctx context.Context, eflog *database.UpdateUserEventLog) error {
	if m.rowErr != nil {
		return m.rowErr
	}
	m.savedFoods = eflog.Foodlogs

	return nil
}
