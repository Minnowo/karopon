package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func addTestActivity(t *testing.T, db database.DB, userID int, name string) int {

	tagID, err := db.AddUserTag(t.Context(), &database.TblUserTag{
		UserID:    userID,
		Namespace: "exercise",
		Name:      name,
	})
	require.NoError(t, err)

	activityID, err := db.AddUserActivity(t.Context(), &database.TblUserActivity{
		UserID:   userID,
		Name:     name,
		TagID:    tagID,
		Duration: 1,
	})
	require.NoError(t, err)

	return activityID
}

func testReminderCRUDPlain(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	reminder := &database.TblUserReminder{
		UserID:          userID,
		Enabled:         true,
		IntervalMinutes: 45,
		LastActivityAt:  database.TimeMillis(time.Now().Truncate(time.Second)),
		ActivityMode:    "all",
		ActiveTimers:    `{"3":41}`,
		Sound:           "chime",
		Name:            "Stretch break",
	}

	reminderID, err := db.AddUserReminder(ctx, reminder, nil)
	require.NoError(t, err)
	require.NotZero(t, reminderID)

	var reminders []database.ReminderWithActivities
	require.NoError(t, db.LoadUserReminders(ctx, userID, &reminders))
	require.Len(t, reminders, 1)
	assert.Equal(t, reminderID, reminders[0].Reminder.ID)
	assert.True(t, reminders[0].Reminder.Enabled)
	assert.Equal(t, 45, reminders[0].Reminder.IntervalMinutes)
	assert.Equal(t, "all", reminders[0].Reminder.ActivityMode)
	assert.Equal(t, `{"3":41}`, reminders[0].Reminder.ActiveTimers)
	assert.Equal(t, "chime", reminders[0].Reminder.Sound)
	assert.Equal(t, "Stretch break", reminders[0].Reminder.Name)
	assert.NotNil(t, reminders[0].Activities)
	assert.Len(t, reminders[0].Activities, 0)
}

func testReminderCRUDWithActivities(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	activity1ID := addTestActivity(t, db, userID, "calf-raises")
	activity2ID := addTestActivity(t, db, userID, "squats")

	reminder := &database.TblUserReminder{
		UserID:          userID,
		Enabled:         true,
		IntervalMinutes: 45,
		LastActivityAt:  database.TimeMillis(time.Now().Truncate(time.Second)),
	}

	reminderID, err := db.AddUserReminder(ctx, reminder, []int{activity1ID, activity2ID})
	require.NoError(t, err)

	var reminders []database.ReminderWithActivities
	require.NoError(t, db.LoadUserReminders(ctx, userID, &reminders))
	require.Len(t, reminders, 1)
	require.Equal(t, reminderID, reminders[0].Reminder.ID)
	require.Len(t, reminders[0].Activities, 2)
	assert.Equal(t, activity1ID, reminders[0].Activities[0].Activity.ID)
	assert.Equal(t, activity2ID, reminders[0].Activities[1].Activity.ID)
	assert.Equal(t, "calf-raises", reminders[0].Activities[0].Tag.Name)
	assert.Equal(t, "squats", reminders[0].Activities[1].Tag.Name)
}

func testSetUserReminderActivitiesReplaces(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	activity1ID := addTestActivity(t, db, userID, "calf-raises")
	activity2ID := addTestActivity(t, db, userID, "squats")
	activity3ID := addTestActivity(t, db, userID, "lunges")

	reminderID, err := db.AddUserReminder(ctx, &database.TblUserReminder{
		UserID:          userID,
		Enabled:         true,
		IntervalMinutes: 45,
		LastActivityAt:  database.TimeMillis(time.Now().Truncate(time.Second)),
	}, []int{activity1ID, activity2ID})
	require.NoError(t, err)

	require.NoError(t, db.SetUserReminderActivities(ctx, userID, reminderID, []int{activity3ID}))

	var reminders []database.ReminderWithActivities
	require.NoError(t, db.LoadUserReminders(ctx, userID, &reminders))
	require.Len(t, reminders, 1)
	require.Len(t, reminders[0].Activities, 1)
	assert.Equal(t, activity3ID, reminders[0].Activities[0].Activity.ID)
}

func testUpdateUserReminder(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	reminder := &database.TblUserReminder{
		UserID:          userID,
		Enabled:         true,
		IntervalMinutes: 45,
		LastActivityAt:  database.TimeMillis(time.Now().Truncate(time.Second)),
		ActivityMode:    "random",
		ActiveTimers:    "{}",
		Sound:           "chime",
		Name:            "Original name",
	}
	reminderID, err := db.AddUserReminder(ctx, reminder, nil)
	require.NoError(t, err)
	reminder.ID = reminderID

	newLastActivity := time.Now().Add(time.Hour).Truncate(time.Second)
	reminder.Enabled = false
	reminder.IntervalMinutes = 60
	reminder.LastActivityAt = database.TimeMillis(newLastActivity)
	reminder.ActivityMode = "all"
	reminder.ActiveTimers = `{"7":12}`
	reminder.Sound = "beep"
	reminder.Name = "Updated name"
	require.NoError(t, db.UpdateUserReminder(ctx, reminder))

	var reminders []database.ReminderWithActivities
	require.NoError(t, db.LoadUserReminders(ctx, userID, &reminders))
	require.Len(t, reminders, 1)
	assert.False(t, reminders[0].Reminder.Enabled)
	assert.Equal(t, 60, reminders[0].Reminder.IntervalMinutes)
	assert.True(t, newLastActivity.Equal(reminders[0].Reminder.LastActivityAt.Time()))
	assert.Equal(t, "all", reminders[0].Reminder.ActivityMode)
	assert.Equal(t, `{"7":12}`, reminders[0].Reminder.ActiveTimers)
	assert.Equal(t, "Updated name", reminders[0].Reminder.Name)
	assert.Equal(t, "beep", reminders[0].Reminder.Sound)
}

func testSetUserReminderActivitiesOwnershipCheck(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)
	otherUserID := getTestUser2(t, db)

	otherUsersActivityID := addTestActivity(t, db, otherUserID, "calf-raises")

	reminderID, err := db.AddUserReminder(ctx, &database.TblUserReminder{
		UserID:          userID,
		Enabled:         true,
		IntervalMinutes: 45,
		LastActivityAt:  database.TimeMillis(time.Now().Truncate(time.Second)),
	}, nil)
	require.NoError(t, err)

	err = db.SetUserReminderActivities(ctx, userID, reminderID, []int{otherUsersActivityID})
	require.ErrorIs(t, err, database.ErrUserDoesNotHaveThisID)
}

func testDeleteUserReminder(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	reminderID, err := db.AddUserReminder(ctx, &database.TblUserReminder{
		UserID:          userID,
		Enabled:         true,
		IntervalMinutes: 45,
		LastActivityAt:  database.TimeMillis(time.Now().Truncate(time.Second)),
	}, nil)
	require.NoError(t, err)

	require.NoError(t, db.DeleteUserReminder(ctx, userID, reminderID))

	var reminders []database.ReminderWithActivities
	require.NoError(t, db.LoadUserReminders(ctx, userID, &reminders))
	assert.Len(t, reminders, 0)
}
