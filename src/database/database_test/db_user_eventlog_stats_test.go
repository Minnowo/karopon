package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testLoadUserEventLogTimeData is a regression test for LoadUserEventLogTimeData, which
// buckets and aggregates a user's blood glucose / insulin dosing fields over time,
// analogous to LoadUserMacrosTimeData for nutrition data.
func testLoadUserEventLogTimeData(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	event := &database.TblUserEvent{UserID: userID, Name: "Dinner"}
	eventID, err := db.AddUserEvent(ctx, event)
	require.NoError(t, err)

	day := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)

	entries := []struct {
		bloodGlucose             float64
		recommendedInsulinAmount float64
		actualInsulinTaken       float64
	}{
		{bloodGlucose: 100, recommendedInsulinAmount: 2, actualInsulinTaken: 2},
		{bloodGlucose: 120, recommendedInsulinAmount: 3, actualInsulinTaken: 4},
	}

	for _, e := range entries {
		eventlog := &database.TblUserEventLog{
			UserID:                   userID,
			EventID:                  eventID,
			UserTime:                 database.TimeMillis(day),
			BloodGlucose:             e.bloodGlucose,
			RecommendedInsulinAmount: e.recommendedInsulinAmount,
			ActualInsulinTaken:       e.actualInsulinTaken,
		}
		_, err := db.AddUserEventLogWith(ctx, eventlog, nil)
		require.NoError(t, err)
	}

	var points []database.EventLogPoint
	require.NoError(t, db.LoadUserEventLogTimeData(
		ctx,
		userID,
		day.Add(-time.Hour),
		day.Add(time.Hour),
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		0,
		&points,
	))

	require.Len(t, points, 1)

	assert.InDelta(t, 220.0, points[0].BloodGlucose, 0.001)
	assert.InDelta(t, 5.0, points[0].RecommendedInsulinAmount, 0.001)
	assert.InDelta(t, 6.0, points[0].ActualInsulinTaken, 0.001)

	expectedBucket := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket))
}
