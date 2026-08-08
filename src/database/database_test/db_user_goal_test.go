package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testGoalCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	goal := &database.TblUserGoal{
		UserID:          userID,
		Name:            "Daily Weight",
		TargetValue:     70.0,
		TargetCol:       string(database.TargetColumnBodyMetric),
		TargetMetric:    "Weight",
		AggregationType: string(database.AggregationAvg),
		ValueComparison: string(database.ComparisonLessThan),
		TimeExpr:        "DAILY",
	}
	goalID, err := db.AddUserGoal(ctx, goal)
	require.NoError(t, err)
	require.NotZero(t, goalID)

	var goals []database.TblUserGoal
	require.NoError(t, db.LoadUserGoals(ctx, userID, &goals))
	require.Len(t, goals, 1)
	assert.Equal(t, "Daily Weight", goals[0].Name)
	assert.Equal(t, "Weight", goals[0].TargetMetric)

	require.NoError(t, db.DeleteUserGoal(ctx, userID, goalID))

	goals = goals[:0]
	require.NoError(t, db.LoadUserGoals(ctx, userID, &goals))
	assert.Empty(t, goals)
}

func testUpdateUserGoal(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	goal := &database.TblUserGoal{
		UserID:          userID,
		Name:            "Daily Protein",
		TargetValue:     150.0,
		TargetCol:       string(database.TargetColumnProtein),
		AggregationType: string(database.AggregationSum),
		ValueComparison: string(database.ComparisonGreaterThan),
		TimeExpr:        "DAILY",
	}
	goalID, err := db.AddUserGoal(ctx, goal)
	require.NoError(t, err)
	goal.ID = goalID

	goal.Name = "Weekly Protein"
	goal.TargetValue = 200.0
	goal.TimeExpr = "WEEKLY"
	require.NoError(t, db.UpdateUserGoal(ctx, goal))

	var goals []database.TblUserGoal
	require.NoError(t, db.LoadUserGoals(ctx, userID, &goals))
	require.Len(t, goals, 1)
	assert.Equal(t, "Weekly Protein", goals[0].Name)
	assert.InDelta(t, 200.0, goals[0].TargetValue, 0.001)
	assert.Equal(t, "WEEKLY", goals[0].TimeExpr)

	// Updating with a different user_id should not affect this user's row.
	other := &database.TblUserGoal{ID: goalID, UserID: userID + 99, Name: "Hijacked"}
	require.NoError(t, db.UpdateUserGoal(ctx, other))

	goals = goals[:0]
	require.NoError(t, db.LoadUserGoals(ctx, userID, &goals))
	require.Len(t, goals, 1)
	assert.Equal(t, "Weekly Protein", goals[0].Name, "row should be unchanged after wrong-user update")
}
