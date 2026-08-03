package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

// testLoadUserMacrosTimeData is a regression test for LoadUserMacrosTimeData, which was
// previously an unimplemented stub on sqlite (always returning an error).
func testLoadUserMacrosTimeData(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	event := &database.TblUserEvent{UserID: userID, Name: "Dinner"}
	eventID, err := db.AddUserEvent(ctx, event)
	require.NoError(t, err)

	day := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)

	eventlog := &database.TblUserEventLog{UserID: userID, EventID: eventID, UserTime: database.TimeMillis(day)}
	logID, err := db.AddUserEventLogWith(ctx, eventlog, nil)
	require.NoError(t, err)

	foodlogs := []struct {
		protein, carb, fibre, fat float64
	}{
		{protein: 10, carb: 20, fibre: 5, fat: 2},
		{protein: 20, carb: 40, fibre: 10, fat: 4},
	}

	for _, f := range foodlogs {
		foodlog := &database.TblUserFoodLog{
			UserID:     userID,
			EventLogID: logID,
			UserTime:   database.TimeMillis(day),
			Name:       "Food",
			Event:      event.Name,
			Unit:       "g",
			Portion:    100,
			Protein:    f.protein,
			Carb:       f.carb,
			Fibre:      f.fibre,
			Fat:        f.fat,
		}

		require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {
			_, err := db.AddUserFoodLogTx(tx, foodlog)
			return err
		}))
	}

	var points []database.MacronutrientPoint
	require.NoError(t, db.LoadUserMacrosTimeData(
		ctx,
		userID,
		day.Add(-time.Hour),
		day.Add(time.Hour),
		database.CALORIE_ATWATER,
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		0,
		&points,
	))

	require.Len(t, points, 1)

	// protein: 10+20=30, carb: 20+40=60, fibre: 5+10=15, fat: 2+4=6
	assert.InDelta(t, 30.0, points[0].Protein, 0.001)
	assert.InDelta(t, 60.0, points[0].Carb, 0.001)
	assert.InDelta(t, 15.0, points[0].Fibre, 0.001)
	assert.InDelta(t, 6.0, points[0].Fat, 0.001)

	// net_carb = carb - fibre = 60 - 15 = 45
	assert.InDelta(t, 45.0, points[0].NetCarb, 0.001)

	// atwater calorie = protein*4 + net_carb*4 + fibre*2 + fat*9
	// = 30*4 + 45*4 + 15*2 + 6*9 = 120 + 180 + 30 + 54 = 384
	assert.InDelta(t, 384.0, points[0].Calorie, 0.001)

	expectedBucket := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket))
}

func testLoadUserMacrosTimeDataAtwaterNoFibre(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	event := &database.TblUserEvent{UserID: userID, Name: "Dinner"}
	eventID, err := db.AddUserEvent(ctx, event)
	require.NoError(t, err)

	day := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)

	eventlog := &database.TblUserEventLog{UserID: userID, EventID: eventID, UserTime: database.TimeMillis(day)}
	logID, err := db.AddUserEventLogWith(ctx, eventlog, nil)
	require.NoError(t, err)

	foodlog := &database.TblUserFoodLog{
		UserID:     userID,
		EventLogID: logID,
		UserTime:   database.TimeMillis(day),
		Name:       "Food",
		Event:      event.Name,
		Unit:       "g",
		Portion:    100,
		Protein:    10,
		Carb:       20,
		Fibre:      5,
		Fat:        2,
	}

	require.NoError(t, db.WithTx(ctx, func(tx *sqlx.Tx) error {
		_, err := db.AddUserFoodLogTx(tx, foodlog)
		return err
	}))

	var points []database.MacronutrientPoint
	require.NoError(t, db.LoadUserMacrosTimeData(
		ctx,
		userID,
		day.Add(-time.Hour),
		day.Add(time.Hour),
		database.CALORIE_ATWATERNOFIBRE,
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		0,
		&points,
	))

	require.Len(t, points, 1)

	// net_carb = 20 - 5 = 15
	// atwater_no_fibre calorie = protein*4 + net_carb*4 + fat*9 (fibre excluded)
	// = 10*4 + 15*4 + 2*9 = 40 + 60 + 18 = 118
	assert.InDelta(t, 118.0, points[0].Calorie, 0.001)
}
