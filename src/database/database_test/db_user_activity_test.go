package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testActivityCRUD1(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	tagID, err := db.AddUserTag(ctx, &database.TblUserTag{
		UserID:    userID,
		Namespace: "exercise",
		Name:      "calf-raises",
	})
	require.NoError(t, err)

	activity := &database.TblUserActivity{
		UserID:   userID,
		Name:     "Calf raises",
		TagID:    tagID,
		Duration: 1,
		Note:     "15 reps, controlled",
	}

	activityID, err := db.AddUserActivity(ctx, activity)
	require.NoError(t, err)
	require.NotZero(t, activityID)
	activity.ID = activityID

	var activities []database.ActivityWithTag
	require.NoError(t, db.LoadUserActivities(ctx, userID, &activities))
	require.Len(t, activities, 1)
	assert.Equal(t, *activity, activities[0].Activity)
	assert.Equal(t, "exercise", activities[0].Tag.Namespace)
	assert.Equal(t, "calf-raises", activities[0].Tag.Name)

	require.NoError(t, db.DeleteUserActivity(ctx, userID, activityID))

	activities = activities[0:0]
	require.NoError(t, db.LoadUserActivities(ctx, userID, &activities))
	assert.Len(t, activities, 0)
}

func testUpdateUserActivity(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	tagID, err := db.AddUserTag(ctx, &database.TblUserTag{
		UserID:    userID,
		Namespace: "exercise",
		Name:      "squats",
	})
	require.NoError(t, err)

	otherTagID, err := db.AddUserTag(ctx, &database.TblUserTag{
		UserID:    userID,
		Namespace: "exercise",
		Name:      "lunges",
	})
	require.NoError(t, err)

	activity := &database.TblUserActivity{
		UserID:   userID,
		Name:     "Squats",
		TagID:    tagID,
		Duration: 1,
		Note:     "10 reps",
	}
	activityID, err := db.AddUserActivity(ctx, activity)
	require.NoError(t, err)
	activity.ID = activityID

	activity.Name = "Lunges"
	activity.TagID = otherTagID
	activity.Duration = 2
	activity.Note = "5 reps per leg"
	require.NoError(t, db.UpdateUserActivity(ctx, activity))

	var activities []database.ActivityWithTag
	require.NoError(t, db.LoadUserActivities(ctx, userID, &activities))
	require.Len(t, activities, 1)
	assert.Equal(t, "Lunges", activities[0].Activity.Name)
	assert.Equal(t, 2, activities[0].Activity.Duration)
	assert.Equal(t, "lunges", activities[0].Tag.Name)
}
