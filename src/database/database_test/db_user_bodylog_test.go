package database_test

import (
	"errors"
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testBodylogCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	weightMetric := &database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "kg"}
	weightMetricID, err := db.AddUserBodyMetric(ctx, weightMetric)
	require.NoError(t, err)
	require.NotZero(t, weightMetricID)

	heightMetric := &database.TblUserBodyMetric{UserID: userID, Name: "Height", Unit: "cm"}
	heightMetricID, err := db.AddUserBodyMetric(ctx, heightMetric)
	require.NoError(t, err)
	require.NotZero(t, heightMetricID)

	var metrics []database.TblUserBodyMetric
	require.NoError(t, db.LoadUserBodyMetrics(ctx, userID, &metrics))
	require.Len(t, metrics, 2)

	entry := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{
			UserID:   userID,
			UserTime: database.TimeMillis(time.Now()),
		},
		Metrics: []database.TblUserBodyLogMetric{
			{BodyMetricID: weightMetricID, Value: 75.5},
			{BodyMetricID: heightMetricID, Value: 180.0},
		},
	}
	id, err := db.AddUserBodyLogs(ctx, entry)
	require.NoError(t, err)
	require.NotZero(t, id)

	var logs []database.UserBodyLog
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	require.Len(t, logs[0].Metrics, 2)

	// Referencing a body metric that doesn't exist for this user should fail.
	badEntry := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(time.Now())},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: weightMetricID + heightMetricID + 999, Value: 1}},
	}
	_, err = db.AddUserBodyLogs(ctx, badEntry)
	require.Error(t, err)
	assert.True(t, errors.Is(err, database.ErrInvalidBodyMetric))

	// Referencing a body metric that belongs to a different user should also fail.
	otherUserID := getTestUser2(t, db)
	otherUserMetric := &database.TblUserBodyMetric{UserID: otherUserID, Name: "Weight", Unit: "kg"}
	otherUserMetricID, err := db.AddUserBodyMetric(ctx, otherUserMetric)
	require.NoError(t, err)

	crossUserEntry := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(time.Now())},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: otherUserMetricID, Value: 1}},
	}
	_, err = db.AddUserBodyLogs(ctx, crossUserEntry)
	require.Error(t, err)
	assert.True(t, errors.Is(err, database.ErrInvalidBodyMetric))

	require.NoError(t, db.DeleteUserBodyLog(ctx, userID, id))

	logs = logs[:0]
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	assert.Empty(t, logs)
}

func testUpdateUserBodyLog(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	weightMetric := &database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "kg"}
	weightMetricID, err := db.AddUserBodyMetric(ctx, weightMetric)
	require.NoError(t, err)

	stepsMetric := &database.TblUserBodyMetric{UserID: userID, Name: "Steps", Unit: "steps"}
	stepsMetricID, err := db.AddUserBodyMetric(ctx, stepsMetric)
	require.NoError(t, err)

	entry := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(time.Now())},
		Metrics: []database.TblUserBodyLogMetric{
			{BodyMetricID: weightMetricID, Value: 70.0},
			{BodyMetricID: stepsMetricID, Value: 5000},
		},
	}
	id, err := db.AddUserBodyLogs(ctx, entry)
	require.NoError(t, err)
	require.NotZero(t, id)

	entry.BodyLog.ID = id
	entry.Metrics = []database.TblUserBodyLogMetric{
		{BodyMetricID: weightMetricID, Value: 68.5},
		{BodyMetricID: stepsMetricID, Value: 10000},
	}

	require.NoError(t, db.UpdateUserBodyLog(ctx, entry))

	var logs []database.UserBodyLog
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	require.Len(t, logs[0].Metrics, 2)

	valueByMetric := make(map[int]float64)
	for _, m := range logs[0].Metrics {
		valueByMetric[m.BodyMetricID] = m.Value
	}
	assert.InDelta(t, 68.5, valueByMetric[weightMetricID], 0.001)
	assert.InDelta(t, 10000, valueByMetric[stepsMetricID], 0.001)

	// Updating with a body metric that belongs to a different user should fail,
	// and must not touch the existing metric values.
	otherUserID := getTestUser2(t, db)
	otherUserMetric := &database.TblUserBodyMetric{UserID: otherUserID, Name: "Weight", Unit: "kg"}
	otherUserMetricID, err := db.AddUserBodyMetric(ctx, otherUserMetric)
	require.NoError(t, err)

	crossUserUpdate := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{ID: id, UserID: userID, UserTime: entry.BodyLog.UserTime},
		Metrics: []database.TblUserBodyLogMetric{{BodyMetricID: otherUserMetricID, Value: 1}},
	}
	err = db.UpdateUserBodyLog(ctx, crossUserUpdate)
	require.Error(t, err)
	assert.True(t, errors.Is(err, database.ErrInvalidBodyMetric))

	logs = logs[:0]
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	require.Len(t, logs[0].Metrics, 2, "metrics should be unchanged after a rejected cross-user update")

	// Updating with a different user_id should not affect this user's row.
	other := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{ID: id, UserID: userID + 99},
	}
	require.NoError(t, db.UpdateUserBodyLog(ctx, other))

	logs = logs[:0]
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	require.Len(t, logs[0].Metrics, 2, "metrics should be unchanged after wrong-user update")
}

func testDeleteUserBodyMetric(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	weightMetric := &database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "kg"}
	weightMetricID, err := db.AddUserBodyMetric(ctx, weightMetric)
	require.NoError(t, err)

	stepsMetric := &database.TblUserBodyMetric{UserID: userID, Name: "Steps", Unit: "steps"}
	stepsMetricID, err := db.AddUserBodyMetric(ctx, stepsMetric)
	require.NoError(t, err)

	entry := &database.UserBodyLog{
		BodyLog: database.TblUserBodyLog{UserID: userID, UserTime: database.TimeMillis(time.Now())},
		Metrics: []database.TblUserBodyLogMetric{
			{BodyMetricID: weightMetricID, Value: 75.5},
			{BodyMetricID: stepsMetricID, Value: 5000},
		},
	}
	id, err := db.AddUserBodyLogs(ctx, entry)
	require.NoError(t, err)
	require.NotZero(t, id)

	// Deleting a metric that still has logged values must not fail with a foreign
	// key violation - the logged values for it should just disappear.
	require.NoError(t, db.DeleteUserBodyMetric(ctx, userID, weightMetricID))

	var metrics []database.TblUserBodyMetric
	require.NoError(t, db.LoadUserBodyMetrics(ctx, userID, &metrics))
	require.Len(t, metrics, 1)
	assert.Equal(t, stepsMetricID, metrics[0].ID)

	var logs []database.UserBodyLog
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1, "the bodylog entry itself should survive")
	require.Len(t, logs[0].Metrics, 1, "only the deleted metric's value should be gone")
	assert.Equal(t, stepsMetricID, logs[0].Metrics[0].BodyMetricID)

	// Deleting a body metric that belongs to a different user should fail and not
	// touch that user's data.
	otherUserID := getTestUser2(t, db)
	otherUserMetric := &database.TblUserBodyMetric{UserID: otherUserID, Name: "Weight", Unit: "kg"}
	otherUserMetricID, err := db.AddUserBodyMetric(ctx, otherUserMetric)
	require.NoError(t, err)

	err = db.DeleteUserBodyMetric(ctx, userID, otherUserMetricID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, database.ErrUserDoesNotHaveThisID))

	var otherMetrics []database.TblUserBodyMetric
	require.NoError(t, db.LoadUserBodyMetrics(ctx, otherUserID, &otherMetrics))
	require.Len(t, otherMetrics, 1, "the other user's metric should be untouched")
}
