package database_test

import (
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

	bodylog := &database.TblUserBodyLog{
		UserID:         userID,
		UserTime:       database.TimeMillis(time.Now()),
		WeightKg:       75.5,
		HeightCm:       180.0,
		BodyFatPercent: 20.0,
	}
	id, err := db.AddUserBodyLogs(ctx, bodylog)
	require.NoError(t, err)
	require.NotZero(t, id)

	var logs []database.TblUserBodyLog
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	assert.InDelta(t, 75.5, logs[0].WeightKg, 0.001)

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

	bodylog := &database.TblUserBodyLog{
		UserID:         userID,
		UserTime:       database.TimeMillis(time.Now()),
		WeightKg:       70.0,
		HeightCm:       175.0,
		BodyFatPercent: 18.0,
		HeartRateBPM:   65,
		BPSystolic:     120,
		BPDiastolic:    80,
		StepsCount:     5000,
	}
	id, err := db.AddUserBodyLogs(ctx, bodylog)
	require.NoError(t, err)
	require.NotZero(t, id)

	bodylog.ID = id
	bodylog.WeightKg = 68.5
	bodylog.HeartRateBPM = 70
	bodylog.StepsCount = 10000

	require.NoError(t, db.UpdateUserBodyLog(ctx, bodylog))

	var logs []database.TblUserBodyLog
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	assert.InDelta(t, 68.5, logs[0].WeightKg, 0.001)
	assert.Equal(t, int16(70), logs[0].HeartRateBPM)
	assert.Equal(t, 10000, logs[0].StepsCount)

	// Updating with a different user_id should not affect this user's row.
	other := &database.TblUserBodyLog{ID: id, UserID: userID + 99, WeightKg: 999.0}
	require.NoError(t, db.UpdateUserBodyLog(ctx, other))

	logs = logs[:0]
	require.NoError(t, db.LoadUserBodyLogs(ctx, userID, &logs))
	require.Len(t, logs, 1)
	assert.InDelta(t, 68.5, logs[0].WeightKg, 0.001, "row should be unchanged after wrong-user update")
}
