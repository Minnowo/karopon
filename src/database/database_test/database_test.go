package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

type NewTestDB func(t *testing.T) database.DB

func getTestUser(t *testing.T, db database.DB) int {

	user := &database.TblUser{
		Name: "test_user",
	}
	userID, err := db.AddUser(t.Context(), user)
	require.NoError(t, err)

	return userID
}
func getTestUser2(t *testing.T, db database.DB) int {

	user := &database.TblUser{
		Name: "test_user2",
	}
	userID, err := db.AddUser(t.Context(), user)
	require.NoError(t, err)

	return userID
}

func runDbTests(t *testing.T, newTestDB NewTestDB) {

	// Prevent any db tests from running at the same time,
	// since the db backend may or may not be a single instance.
	// If newTestDB does not return a separate db, and instead clears a single one each test,
	// this should prevent problems.
	lock := sync.Mutex{}

	t.Run("version_check", func(t *testing.T) { testVersionCheck(t, newTestDB, &lock) })
	t.Run("user_crud", func(t *testing.T) { testUserCRUD(t, newTestDB, &lock) })
	t.Run("has_any_user", func(t *testing.T) { testHasAnyUser(t, newTestDB, &lock) })
	t.Run("user_session_lifecycle", func(t *testing.T) { testUserSessionLifecycle(t, newTestDB, &lock) })
	t.Run("food_crud_1", func(t *testing.T) { testFoodCRUD1(t, newTestDB, &lock) })
	t.Run("food_crud_2", func(t *testing.T) { testFoodCRUD2(t, newTestDB, &lock) })
	t.Run("event_and_eventlog", func(t *testing.T) { testEventAndEventlog(t, newTestDB, &lock) })
	t.Run("datasource_and_similar_search", func(t *testing.T) { testDataSourceAndSimilarSearch(t, newTestDB, &lock) })
	t.Run("exports_do_not_error", func(t *testing.T) { testExportsDoNotError(t, newTestDB, &lock) })
	t.Run("with_tx_commits", func(t *testing.T) { testWithTxCommits(t, newTestDB, &lock) })
	t.Run("with_tx_read", func(t *testing.T) { testWithTxRead(t, newTestDB, &lock) })
	t.Run("AddUserTag", func(t *testing.T) { testAddUserTag(t, newTestDB, &lock) })
	t.Run("LoadUserTags", func(t *testing.T) { testLoadUserTags(t, newTestDB, &lock) })
	t.Run("LoadUserTagNamespaces", func(t *testing.T) { testLoadUserTagNamespaces(t, newTestDB, &lock) })
	t.Run("LoadUserNamespaceTags", func(t *testing.T) { testLoadUserNamespaceTags(t, newTestDB, &lock) })
	t.Run("LoadUserNamespaceTagsLikeN", func(t *testing.T) { testLoadUserNamespaceTagsLikeN(t, newTestDB, &lock) })
	t.Run("UpdateUserTag", func(t *testing.T) { testUpdateUserTag(t, newTestDB, &lock) })
	t.Run(
		"UpdateUserTagCollisionWithoutMerge",
		func(t *testing.T) { testUpdateUserTagCollisionWithoutMerge(t, newTestDB, &lock) },
	)
	t.Run("UpdateUserTagMerge", func(t *testing.T) { testUpdateUserTagMerge(t, newTestDB, &lock) })
	t.Run("AddUserTimespan", func(t *testing.T) { testAddUserTimespan(t, newTestDB, &lock) })
	t.Run("DBx_and_Base", func(t *testing.T) { testDBxAndBase(t, newTestDB, &lock) })
	t.Run("LoadUser", func(t *testing.T) { testLoadUser(t, newTestDB, &lock) })
	t.Run("LoadUserSessions", func(t *testing.T) { testLoadUserSessions(t, newTestDB, &lock) })
	t.Run(
		"DeleteUserSessionsExpireAfter",
		func(t *testing.T) { testDeleteUserSessionsExpireAfter(t, newTestDB, &lock) },
	)
	t.Run("UpdateUserSessionUserAgent", func(t *testing.T) { testUpdateUserSessionUserAgent(t, newTestDB, &lock) })
	t.Run("UpdateUserFood", func(t *testing.T) { testUpdateUserFood(t, newTestDB, &lock) })
	t.Run("LoadUserEventByName", func(t *testing.T) { testLoadUserEventByName(t, newTestDB, &lock) })
	t.Run("LoadUserEvents", func(t *testing.T) { testLoadUserEvents(t, newTestDB, &lock) })
	t.Run(
		"LoadAndOrCreateUserEventByNameTx",
		func(t *testing.T) { testLoadAndOrCreateUserEventByNameTx(t, newTestDB, &lock) },
	)
	t.Run("AddUserEventLogTx", func(t *testing.T) { testAddUserEventLogTx(t, newTestDB, &lock) })
	t.Run("LoadUserEventLogsTx", func(t *testing.T) { testLoadUserEventLogsTx(t, newTestDB, &lock) })
	t.Run("DeleteUserEventLog", func(t *testing.T) { testDeleteUserEventLog(t, newTestDB, &lock) })
	t.Run("LoadUserEventFoodLog", func(t *testing.T) { testLoadUserEventFoodLog(t, newTestDB, &lock) })
	t.Run("LoadUserEventFoodLogs", func(t *testing.T) { testLoadUserEventFoodLogs(t, newTestDB, &lock) })
	t.Run("LoadUserEventFoodLogsN", func(t *testing.T) { testLoadUserEventFoodLogsN(t, newTestDB, &lock) })
	t.Run("UpdateUserEventFoodLog", func(t *testing.T) { testUpdateUserEventFoodLog(t, newTestDB, &lock) })
	t.Run("bodylog_crud", func(t *testing.T) { testBodylogCRUD(t, newTestDB, &lock) })
	t.Run("UpdateUserBodyLog", func(t *testing.T) { testUpdateUserBodyLog(t, newTestDB, &lock) })
	t.Run("DeleteUserBodyMetric", func(t *testing.T) { testDeleteUserBodyMetric(t, newTestDB, &lock) })
	t.Run(
		"LoadDataSourceFoodBySimilarNameN",
		func(t *testing.T) { testLoadDataSourceFoodBySimilarNameN(t, newTestDB, &lock) },
	)
	t.Run("goal_crud", func(t *testing.T) { testGoalCRUD(t, newTestDB, &lock) })
	t.Run(
		"goal_target_metric_unit_separator_delimiter",
		func(t *testing.T) { testGoalTargetMetricUnitSeparatorDelimiter(t, newTestDB, &lock) },
	)
	t.Run("UpdateUserGoal", func(t *testing.T) { testUpdateUserGoal(t, newTestDB, &lock) })
	t.Run("DeleteUserTimespan", func(t *testing.T) { testDeleteUserTimespan(t, newTestDB, &lock) })
	t.Run("UpdateUserTimespan", func(t *testing.T) { testUpdateUserTimespan(t, newTestDB, &lock) })
	t.Run("LoadUserTimespansN", func(t *testing.T) { testLoadUserTimespansN(t, newTestDB, &lock) })
	t.Run("LoadUserTimespansWithTags", func(t *testing.T) { testLoadUserTimespansWithTags(t, newTestDB, &lock) })
	t.Run("LoadUserTimespansWithTagsN", func(t *testing.T) { testLoadUserTimespansWithTagsN(t, newTestDB, &lock) })
	t.Run(
		"LoadUserTimespansWithTags_permission_check",
		func(t *testing.T) { testLoadUserTimespansWithTagsPermissionCheck(t, newTestDB, &lock) },
	)
	t.Run("LoadUserTimeData", func(t *testing.T) { testLoadUserTimeData(t, newTestDB, &lock) })
	t.Run("LoadUserTimeData_aggregations", func(t *testing.T) { testLoadUserTimeDataAggregations(t, newTestDB, &lock) })
	t.Run("LoadUserTimeData_timezone", func(t *testing.T) { testLoadUserTimeDataTimezone(t, newTestDB, &lock) })
	t.Run(
		"LoadUserTimeData_timezone_year",
		func(t *testing.T) { testLoadUserTimeDataTimezoneYear(t, newTestDB, &lock) },
	)
	t.Run("LoadUserTimeData_dayOffset", func(t *testing.T) { testLoadUserTimeDataDayOffset(t, newTestDB, &lock) })
	t.Run("LoadUserTimeData_no_tags", func(t *testing.T) { testLoadUserTimeDataNoTags(t, newTestDB, &lock) })
	t.Run("LoadUserBodyLogTimeData", func(t *testing.T) { testLoadUserBodyLogTimeData(t, newTestDB, &lock) })
	t.Run(
		"LoadUserBodyLogTimeData_aggregations",
		func(t *testing.T) { testLoadUserBodyLogTimeDataAggregations(t, newTestDB, &lock) },
	)
	t.Run(
		"LoadUserBodyLogTimeData_dayOffset",
		func(t *testing.T) { testLoadUserBodyLogTimeDataDayOffset(t, newTestDB, &lock) },
	)
	t.Run(
		"LoadUserBodyLogTimeData_no_metrics",
		func(t *testing.T) { testLoadUserBodyLogTimeDataNoMetrics(t, newTestDB, &lock) },
	)
	t.Run("LoadUserMacrosTimeData", func(t *testing.T) { testLoadUserMacrosTimeData(t, newTestDB, &lock) })
	t.Run(
		"LoadUserMacrosTimeData_atwater_no_fibre",
		func(t *testing.T) { testLoadUserMacrosTimeDataAtwaterNoFibre(t, newTestDB, &lock) },
	)
	t.Run("LoadUserEventLogTimeData", func(t *testing.T) { testLoadUserEventLogTimeData(t, newTestDB, &lock) })
	t.Run("SetUserTimespanTags", func(t *testing.T) { testSetUserTimespanTags(t, newTestDB, &lock) })
	t.Run("dashboard_crud", func(t *testing.T) { testDashboardCRUD(t, newTestDB, &lock) })
	t.Run("dashboard_multiple_per_user", func(t *testing.T) { testDashboardMultiplePerUser(t, newTestDB, &lock) })
	t.Run("tag_color_crud", func(t *testing.T) { testTagColorCRUD(t, newTestDB, &lock) })
	t.Run("tag_color_user_isolation", func(t *testing.T) { testTagColorUserIsolation(t, newTestDB, &lock) })
	t.Run("user_photo_add", func(t *testing.T) { testUserPhotoAdd(t, newTestDB, &lock) })
	t.Run("user_eventlog_photo_mapping", func(t *testing.T) { testUserEventlogPhotoMapping(t, newTestDB, &lock) })
	t.Run("activity_crud_1", func(t *testing.T) { testActivityCRUD1(t, newTestDB, &lock) })
	t.Run("UpdateUserActivity", func(t *testing.T) { testUpdateUserActivity(t, newTestDB, &lock) })
	t.Run("exercise_crud", func(t *testing.T) { testExerciseCRUD(t, newTestDB, &lock) })
	t.Run("workout_crud", func(t *testing.T) { testWorkoutCRUD(t, newTestDB, &lock) })
	t.Run("workoutlog_lifecycle", func(t *testing.T) { testWorkoutLogLifecycle(t, newTestDB, &lock) })
	t.Run(
		"workoutlog_limit_missing_refs",
		func(t *testing.T) { testWorkoutLogLimitAndMissingRefs(t, newTestDB, &lock) },
	)
	t.Run("workout_user_scoping", func(t *testing.T) { testWorkoutUserScoping(t, newTestDB, &lock) })
	t.Run("workout_tag_merge_delete", func(t *testing.T) { testWorkoutTagMergeAndDelete(t, newTestDB, &lock) })
	t.Run("reminder_crud_plain", func(t *testing.T) { testReminderCRUDPlain(t, newTestDB, &lock) })
	t.Run("reminder_crud_with_activities", func(t *testing.T) { testReminderCRUDWithActivities(t, newTestDB, &lock) })
	t.Run(
		"SetUserReminderActivities_replaces",
		func(t *testing.T) { testSetUserReminderActivitiesReplaces(t, newTestDB, &lock) },
	)
	t.Run("UpdateUserReminder", func(t *testing.T) { testUpdateUserReminder(t, newTestDB, &lock) })
	t.Run(
		"SetUserReminderActivities_ownership_check",
		func(t *testing.T) { testSetUserReminderActivitiesOwnershipCheck(t, newTestDB, &lock) },
	)
	t.Run("DeleteUserReminder", func(t *testing.T) { testDeleteUserReminder(t, newTestDB, &lock) })
}
