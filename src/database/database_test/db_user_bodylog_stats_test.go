package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testLoadUserBodyLogTimeData(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	weightMetricID, err := db.AddUserBodyMetric(
		ctx,
		&database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "kg"},
	)
	require.NoError(t, err)

	heightMetricID, err := db.AddUserBodyMetric(
		ctx,
		&database.TblUserBodyMetric{UserID: userID, Name: "Height", Unit: "cm"},
	)
	require.NoError(t, err)

	day := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)

	_, err = db.AddUserBodyLogs(ctx, &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(day)},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: weightMetricID, Value: 70}},
	})
	require.NoError(t, err)

	// Second entry same day - should aggregate into the same bucket.
	_, err = db.AddUserBodyLogs(ctx, &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(day.Add(2 * time.Hour))},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: weightMetricID, Value: 75}},
	})
	require.NoError(t, err)

	// A different metric, and a different day, should not be counted towards the "Weight" bucket.
	otherDay := day.AddDate(0, 0, 1)
	_, err = db.AddUserBodyLogs(ctx, &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(otherDay)},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: heightMetricID, Value: 180}},
	})
	require.NoError(t, err)

	var points []database.BodyLogMetricPoint
	require.NoError(t, db.LoadUserBodyLogTimeData(
		ctx,
		userID,
		day.Add(-time.Hour),
		day.Add(24*time.Hour),
		[]string{"Weight"},
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		0,
		&points,
	))

	require.Len(t, points, 1)
	assert.Equal(t, "Weight", points[0].Metric)
	assert.InDelta(t, 145.0, points[0].Value, 0.001)

	expectedBucket := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket))
}

func testLoadUserBodyLogTimeDataAggregations(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	metricID, err := db.AddUserBodyMetric(
		ctx,
		&database.TblUserBodyMetric{UserID: userID, Name: "Steps", Unit: "steps"},
	)
	require.NoError(t, err)

	day := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)

	for _, v := range []float64{1000, 2000, 3000} {
		_, err = db.AddUserBodyLogs(ctx, &database.UserBodyLog{
			BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(day)},
			Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: metricID, Value: v}},
		})
		require.NoError(t, err)
	}

	loadWith := func(agg database.AggregationFunc) float64 {
		var points []database.BodyLogMetricPoint
		require.NoError(t, db.LoadUserBodyLogTimeData(
			ctx,
			userID,
			day.Add(-time.Hour),
			day.Add(time.Hour),
			[]string{"Steps"},
			agg,
			database.GroupByDay,
			database.Timezone{},
			0,
			&points,
		))
		require.Len(t, points, 1)
		return points[0].Value
	}

	assert.InDelta(t, 6000.0, loadWith(database.AggregationSum), 0.001)
	assert.InDelta(t, 2000.0, loadWith(database.AggregationAvg), 0.001)
	assert.InDelta(t, 1000.0, loadWith(database.AggregationMin), 0.001)
	assert.InDelta(t, 3000.0, loadWith(database.AggregationMax), 0.001)
}

func testLoadUserBodyLogTimeDataDayOffset(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	metricID, err := db.AddUserBodyMetric(ctx, &database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "kg"})
	require.NoError(t, err)

	// User's day starts at 04:00 UTC. An entry at 02:00 UTC on Jan 16th belongs to the
	// "day" that started at 04:00 UTC on Jan 15th.
	dayOffset := 4 * time.Hour
	entryTime := time.Date(2024, 1, 16, 2, 0, 0, 0, time.UTC)

	_, err = db.AddUserBodyLogs(ctx, &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(entryTime)},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: metricID, Value: 70}},
	})
	require.NoError(t, err)

	var points []database.BodyLogMetricPoint
	require.NoError(t, db.LoadUserBodyLogTimeData(
		ctx,
		userID,
		entryTime.Add(-24*time.Hour),
		entryTime.Add(24*time.Hour),
		[]string{"Weight"},
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		dayOffset,
		&points,
	))

	require.Len(t, points, 1)

	expectedBucket := time.Date(2024, 1, 15, 4, 0, 0, 0, time.UTC)
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket),
		"expected bucket %s (Jan 15 day start), got %s", expectedBucket, points[0].Bucket.Time())
}

func testLoadUserBodyLogTimeDataNoMetrics(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	var points []database.BodyLogMetricPoint
	require.NoError(t, db.LoadUserBodyLogTimeData(
		ctx,
		userID,
		time.Now().Add(-time.Hour),
		time.Now().Add(time.Hour),
		nil,
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		0,
		&points,
	))

	assert.Empty(t, points)
}
