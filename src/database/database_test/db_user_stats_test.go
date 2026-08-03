package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testLoadUserTimeData(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	start := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)
	stop := start.Add(2 * time.Hour)

	_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(start),
		StopTime:  database.TimeMillis(stop),
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "activity", Name: "sleep"},
	})
	require.NoError(t, err)

	// A second timespan, on a different day and a different tag, should not be counted
	// towards the "activity:sleep" bucket for the day of the first timespan.
	otherStart := start.AddDate(0, 0, 1)
	_, err = db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(otherStart),
		StopTime:  database.TimeMillis(otherStart.Add(time.Hour)),
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "activity", Name: "work"},
	})
	require.NoError(t, err)

	var points []database.TimespanTagDurationPoint
	require.NoError(t, db.LoadUserTimeData(
		ctx,
		userID,
		start.Add(-time.Hour),
		stop.Add(48*time.Hour),
		[]string{"activity:sleep"},
		database.AggregationSum,
		database.GroupByDay,
		database.Timezone{},
		0,
		&points,
	))

	require.Len(t, points, 1)
	assert.Equal(t, "activity:sleep", points[0].Tag)
	assert.Equal(t, int64(2*time.Hour/time.Millisecond), points[0].DurationMilli)

	expectedBucket := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket))
}

func testLoadUserTimeDataTimezone(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	tz, err := database.NewTimezone("America/New_York")
	require.NoError(t, err)

	// 2024-07-01 02:00 UTC is 2024-06-30 22:00 in America/New_York (UTC-4 during DST).
	// Grouping by month should bucket this into June in the user's local timezone, not
	// July as a naive UTC date_trunc would.
	start := time.Date(2024, 7, 1, 2, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)

	_, err = db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(start),
		StopTime:  database.TimeMillis(stop),
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "activity", Name: "sleep"},
	})
	require.NoError(t, err)

	var points []database.TimespanTagDurationPoint
	require.NoError(t, db.LoadUserTimeData(
		ctx,
		userID,
		start.Add(-24*time.Hour),
		stop.Add(24*time.Hour),
		[]string{"activity:sleep"},
		database.AggregationSum,
		database.GroupByMonth,
		tz,
		0,
		&points,
	))

	require.Len(t, points, 1)

	expectedBucket := time.Date(2024, 6, 1, 0, 0, 0, 0, tz.Loc())
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket),
		"expected bucket %s (local June 1st), got %s", expectedBucket, points[0].Bucket.Time())
}

func testLoadUserTimeDataTimezoneYear(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	tz, err := database.NewTimezone("America/Los_Angeles")
	require.NoError(t, err)

	// 2024-01-01 03:00 UTC is 2023-12-31 19:00 in America/Los_Angeles (UTC-8 in winter).
	// Grouping by year should bucket this into 2023 in the user's local timezone, not
	// 2024 as a naive UTC date_trunc would.
	start := time.Date(2024, 1, 1, 3, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)

	_, err = db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(start),
		StopTime:  database.TimeMillis(stop),
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "activity", Name: "sleep"},
	})
	require.NoError(t, err)

	var points []database.TimespanTagDurationPoint
	require.NoError(t, db.LoadUserTimeData(
		ctx,
		userID,
		start.Add(-24*time.Hour),
		stop.Add(24*time.Hour),
		[]string{"activity:sleep"},
		database.AggregationSum,
		database.GroupByYear,
		tz,
		0,
		&points,
	))

	require.Len(t, points, 1)

	expectedBucket := time.Date(2023, 1, 1, 0, 0, 0, 0, tz.Loc())
	assert.True(t, points[0].Bucket.Time().Equal(expectedBucket),
		"expected bucket %s (local year 2023), got %s", expectedBucket, points[0].Bucket.Time())
}

func testLoadUserTimeDataDayOffset(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	// User's day starts at 04:00 UTC. A timespan at 02:00 UTC on Jan 16th belongs to the
	// "day" that started at 04:00 UTC on Jan 15th.
	dayOffset := 4 * time.Hour
	start := time.Date(2024, 1, 16, 2, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)

	_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID:    userID,
		StartTime: database.TimeMillis(start),
		StopTime:  database.TimeMillis(stop),
	}, []database.TblUserTag{
		{UserID: userID, Namespace: "activity", Name: "sleep"},
	})
	require.NoError(t, err)

	var points []database.TimespanTagDurationPoint
	require.NoError(t, db.LoadUserTimeData(
		ctx,
		userID,
		start.Add(-24*time.Hour),
		stop.Add(24*time.Hour),
		[]string{"activity:sleep"},
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

func testLoadUserTimeDataNoTags(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	var points []database.TimespanTagDurationPoint
	require.NoError(t, db.LoadUserTimeData(
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

// testLoadUserTimeDataAggregations exercises AVG/MIN/MAX, not just the SUM default, on three
// same-day timespans of different durations. Regression test for both LoadUserTimeData
// implementations previously hardcoding SUM regardless of the requested aggregation.
func testLoadUserTimeDataAggregations(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	day := time.Date(2024, 1, 15, 8, 0, 0, 0, time.UTC)

	for _, durationMinutes := range []int{10, 20, 30} {
		_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
			UserID:    userID,
			StartTime: database.TimeMillis(day),
			StopTime:  database.TimeMillis(day.Add(time.Duration(durationMinutes) * time.Minute)),
		}, []database.TblUserTag{
			{UserID: userID, Namespace: "activity", Name: "sleep"},
		})
		require.NoError(t, err)
	}

	loadWith := func(agg database.AggregationFunc) int64 {
		var points []database.TimespanTagDurationPoint
		require.NoError(t, db.LoadUserTimeData(
			ctx,
			userID,
			day.Add(-time.Hour),
			day.Add(time.Hour),
			[]string{"activity:sleep"},
			agg,
			database.GroupByDay,
			database.Timezone{},
			0,
			&points,
		))
		require.Len(t, points, 1)
		return points[0].DurationMilli
	}

	assert.Equal(t, int64(60*time.Minute/time.Millisecond), loadWith(database.AggregationSum))
	assert.Equal(t, int64(20*time.Minute/time.Millisecond), loadWith(database.AggregationAvg))
	assert.Equal(t, int64(10*time.Minute/time.Millisecond), loadWith(database.AggregationMin))
	assert.Equal(t, int64(30*time.Minute/time.Millisecond), loadWith(database.AggregationMax))
}
