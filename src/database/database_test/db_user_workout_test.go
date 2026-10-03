package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func tagNames(tags []database.TblUserTag) []string {
	out := make([]string, len(tags))
	for i, t := range tags {
		out[i] = t.Namespace + ":" + t.Name
	}
	return out
}

func ms(v int64) database.TimeMillis {
	return database.TimeMillis(time.UnixMilli(v).UTC())
}

func testExerciseCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	ex := &database.TblUserExercise{UserID: userID, Name: "Squat", Note: "deep"}
	tags := []database.TblUserTag{{Namespace: "legs", Name: "squat"}, {Namespace: "gym", Name: "barbell"}}

	id, err := db.AddUserExercise(ctx, ex, tags)
	require.NoError(t, err)
	require.NotZero(t, id)
	ex.ID = id

	var out []database.ExerciseWithTags
	require.NoError(t, db.LoadUserExercises(ctx, userID, &out))
	require.Len(t, out, 1)
	assert.Equal(t, *ex, out[0].Exercise)
	assert.ElementsMatch(t, []string{"legs:squat", "gym:barbell"}, tagNames(out[0].Tags))

	ex.Name = "Front Squat"
	require.NoError(t, db.UpdateUserExercise(ctx, ex, []database.TblUserTag{{Namespace: "legs", Name: "front_squat"}}))

	require.NoError(t, db.LoadUserExercises(ctx, userID, &out))
	require.Len(t, out, 1)
	assert.Equal(t, "Front Squat", out[0].Exercise.Name)
	assert.Equal(t, []string{"legs:front_squat"}, tagNames(out[0].Tags))

	// No tags loads as an empty slice.
	require.NoError(t, db.UpdateUserExercise(ctx, ex, nil))
	require.NoError(t, db.LoadUserExercises(ctx, userID, &out))
	assert.NotNil(t, out[0].Tags)
	assert.Empty(t, out[0].Tags)

	require.NoError(t, db.DeleteUserExercise(ctx, userID, id))
	require.NoError(t, db.LoadUserExercises(ctx, userID, &out))
	assert.Empty(t, out)
}

func testWorkoutCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	structure := `{"v":1,"sets":[{"name":"Tabata","tags":[],"rounds":8,"steps":[]}]}`
	w := &database.TblUserWorkout{UserID: userID, Name: "Legs", Note: "n", Structure: structure}

	id, err := db.AddUserWorkout(ctx, w, []database.TblUserTag{{Namespace: "workout", Name: "legs"}})
	require.NoError(t, err)
	w.ID = id

	var out []database.WorkoutWithTags
	require.NoError(t, db.LoadUserWorkouts(ctx, userID, &out))
	require.Len(t, out, 1)
	assert.Equal(t, *w, out[0].Workout)
	assert.Equal(t, structure, out[0].Workout.Structure)
	assert.Equal(t, []string{"workout:legs"}, tagNames(out[0].Tags))

	w.Structure = `{"v":1,"sets":[]}`
	require.NoError(t, db.UpdateUserWorkout(ctx, w, []database.TblUserTag{{Namespace: "workout", Name: "legs2"}}))
	require.NoError(t, db.LoadUserWorkouts(ctx, userID, &out))
	assert.Equal(t, `{"v":1,"sets":[]}`, out[0].Workout.Structure)
	assert.Equal(t, []string{"workout:legs2"}, tagNames(out[0].Tags))

	require.NoError(t, db.DeleteUserWorkout(ctx, userID, id))
	require.NoError(t, db.LoadUserWorkouts(ctx, userID, &out))
	assert.Empty(t, out)
}

// newTestWorkoutLog has a tagged timed step split by a pause, an untagged timed step, a skipped reps step,
// and a second round of the tagged step with its tags in a different order.
func newTestWorkoutLog(userID int, workoutID, exerciseID *int) *database.NewWorkoutLog {
	return &database.NewWorkoutLog{
		WorkoutLog: database.TblUserWorkoutLog{
			UserID:    userID,
			WorkoutID: workoutID,
			Name:      "Legs",
			StartTime: ms(1_000_000),
			StopTime:  ms(1_060_000),
			PausedMs:  3000,
			Completed: true,
			Note:      "good",
		},
		Steps: []database.NewWorkoutLogStep{
			{
				Step: database.TblUserWorkoutStepLog{
					ExerciseID:    exerciseID,
					Name:          "Jacks",
					Kind:          database.StepKindTimed,
					SetNumber:     1,
					Round:         1,
					Step:          1,
					TargetSeconds: 20,
				},
				Segments: []database.TimeSegment{
					{StartTime: ms(1_000_000), StopTime: ms(1_005_000)},
					{StartTime: ms(1_008_000), StopTime: ms(1_023_000)},
				},
				Tags: []database.TblUserTag{
					{Namespace: "workout", Name: "legs"},
					{Namespace: "legs", Name: "cardio"},
					{Namespace: "cardio", Name: "jumping_jack"},
				},
			},
			{
				Step: database.TblUserWorkoutStepLog{
					Name: "Rest", Kind: database.StepKindTimed, SetNumber: 1, Round: 1, Step: 2, TargetSeconds: 10,
				},
				Segments: []database.TimeSegment{{StartTime: ms(1_023_000), StopTime: ms(1_033_000)}},
			},
			{
				Step: database.TblUserWorkoutStepLog{
					Name: "Squat", Kind: database.StepKindWeighted, SetNumber: 2, Round: 1, Step: 1, TargetReps: 8,
					TargetWeight: 60,
					Unit:         "kg",
				},
			},
			{
				Step: database.TblUserWorkoutStepLog{
					ExerciseID:    exerciseID,
					Name:          "Jacks",
					Kind:          database.StepKindTimed,
					SetNumber:     1,
					Round:         2,
					Step:          1,
					TargetSeconds: 20,
				},
				Segments: []database.TimeSegment{{StartTime: ms(1_040_000), StopTime: ms(1_050_000)}},
				Tags: []database.TblUserTag{
					{Namespace: "cardio", Name: "jumping_jack"},
					{Namespace: "workout", Name: "legs"},
					{Namespace: "legs", Name: "cardio"},
				},
			},
		},
	}
}

func testWorkoutLogLifecycle(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	// An unrelated timespan must survive the log being deleted.
	_, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
		UserID: userID, StartTime: ms(1), StopTime: ms(2),
	}, []database.TblUserTag{{Namespace: "work", Name: "other"}})
	require.NoError(t, err)

	exID, err := db.AddUserExercise(ctx, &database.TblUserExercise{
		UserID: userID, Name: "Jacks",
	}, nil)
	require.NoError(t, err)

	wID, err := db.AddUserWorkout(ctx, &database.TblUserWorkout{UserID: userID, Name: "Legs"}, nil)
	require.NoError(t, err)

	logID, err := db.AddUserWorkoutLog(ctx, newTestWorkoutLog(userID, &wID, &exID))
	require.NoError(t, err)
	require.NotZero(t, logID)

	// One timespan summing every step with the same tags, none for the untagged steps.
	var spans []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &spans))
	require.Len(t, spans, 2)

	var workoutSpans []database.TaggedTimespan
	for _, s := range spans {
		if len(s.Tags) == 3 {
			workoutSpans = append(workoutSpans, s)
		}
	}
	require.Len(t, workoutSpans, 1)
	assert.ElementsMatch(
		t,
		[]string{"workout:legs", "legs:cardio", "cardio:jumping_jack"},
		tagNames(workoutSpans[0].Tags),
	)
	assert.Equal(t, int64(1_000_000), workoutSpans[0].Timespan.StartTime.Time().UnixMilli())
	assert.Equal(t, int64(1_030_000), workoutSpans[0].Timespan.StopTime.Time().UnixMilli())
	assert.Nil(t, workoutSpans[0].Timespan.Note)

	var logs []database.WorkoutLogWithSteps
	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, -1, &logs))
	require.Len(t, logs, 1)

	wl := logs[0].WorkoutLog
	assert.Equal(t, logID, wl.ID)
	require.NotNil(t, wl.WorkoutID)
	assert.Equal(t, wID, *wl.WorkoutID)
	assert.Equal(t, int64(3000), wl.PausedMs)
	assert.True(t, wl.Completed)
	assert.Equal(t, int64(1_060_000), wl.StopTime.Time().UnixMilli())

	var single database.WorkoutLogWithSteps
	require.NoError(t, db.LoadUserWorkoutLog(ctx, userID, logID, &single))
	assert.Equal(t, logs[0], single)

	steps := logs[0].Steps
	require.Len(t, steps, 4)
	assert.Equal(
		t,
		[]string{"Jacks", "Rest", "Squat", "Jacks"},
		[]string{steps[0].Name, steps[1].Name, steps[2].Name, steps[3].Name},
	)
	// Actual seconds is the sum of the segments, and 0 for the skipped step.
	assert.Equal(t, []int{20, 10, 0}, []int{steps[0].ActualSeconds, steps[1].ActualSeconds, steps[2].ActualSeconds})
	assert.Equal(t, []int{2, 1, 1}, []int{steps[2].SetNumber, steps[2].Round, steps[2].Step})
	assert.Equal(t, 60.0, steps[2].TargetWeight)
	assert.Equal(t, "kg", steps[2].Unit)

	// Update only changes the note and actuals.
	logs[0].WorkoutLog.Note = "better"
	logs[0].WorkoutLog.Name = "ignored"
	logs[0].Steps[2].ActualReps = 6
	logs[0].Steps[2].ActualWeight = 70
	logs[0].Steps[2].Name = "ignored"
	require.NoError(t, db.UpdateUserWorkoutLog(ctx, &logs[0]))

	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, -1, &logs))
	assert.Equal(t, "better", logs[0].WorkoutLog.Note)
	assert.Equal(t, "Legs", logs[0].WorkoutLog.Name)
	assert.Equal(t, 6, logs[0].Steps[2].ActualReps)
	assert.Equal(t, 70.0, logs[0].Steps[2].ActualWeight)
	assert.Equal(t, "Squat", logs[0].Steps[2].Name)

	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &spans))
	assert.Len(t, spans, 2)

	// Deleting the exercise and workout keeps the log with null IDs.
	require.NoError(t, db.DeleteUserExercise(ctx, userID, exID))
	require.NoError(t, db.DeleteUserWorkout(ctx, userID, wID))
	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, -1, &logs))
	require.Len(t, logs, 1)
	assert.Nil(t, logs[0].WorkoutLog.WorkoutID)
	assert.Nil(t, logs[0].Steps[0].ExerciseID)

	// Deleting the log removes its timespans only.
	require.NoError(t, db.DeleteUserWorkoutLog(ctx, userID, logID))
	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, -1, &logs))
	assert.Empty(t, logs)

	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &spans))
	require.Len(t, spans, 1)
	assert.Equal(t, []string{"work:other"}, tagNames(spans[0].Tags))
}

func testWorkoutLogLimitAndMissingRefs(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	// IDs that don't exist are saved as null instead of failing.
	missing := 9999
	for i := range 3 {
		log := newTestWorkoutLog(userID, &missing, &missing)
		log.WorkoutLog.StartTime = ms(int64(i+1) * 1_000_000)
		_, err := db.AddUserWorkoutLog(ctx, log)
		require.NoError(t, err)
	}

	var logs []database.WorkoutLogWithSteps
	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, 2, &logs))
	require.Len(t, logs, 2)
	assert.Equal(t, int64(3_000_000), logs[0].WorkoutLog.StartTime.Time().UnixMilli())
	assert.Nil(t, logs[0].WorkoutLog.WorkoutID)
	assert.Nil(t, logs[0].Steps[0].ExerciseID)

	for _, l := range logs {
		assert.Len(t, l.Steps, 4)
	}
}

func testWorkoutUserScoping(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)
	otherID := getTestUser2(t, db)

	exID, err := db.AddUserExercise(ctx, &database.TblUserExercise{
		UserID: userID, Name: "Jacks",
	}, nil)
	require.NoError(t, err)

	wID, err := db.AddUserWorkout(ctx, &database.TblUserWorkout{UserID: userID, Name: "Legs"}, nil)
	require.NoError(t, err)

	logID, err := db.AddUserWorkoutLog(ctx, newTestWorkoutLog(userID, &wID, &exID))
	require.NoError(t, err)

	err = db.UpdateUserExercise(
		ctx,
		&database.TblUserExercise{ID: exID, UserID: otherID, Name: "x"},
		nil,
	)
	assert.ErrorIs(t, err, database.ErrUserDoesNotHaveThisID)

	err = db.UpdateUserWorkout(ctx, &database.TblUserWorkout{ID: wID, UserID: otherID, Name: "x"}, nil)
	assert.ErrorIs(t, err, database.ErrUserDoesNotHaveThisID)

	var logs []database.WorkoutLogWithSteps
	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, -1, &logs))
	stolen := logs[0]
	stolen.WorkoutLog.UserID = otherID
	stolen.WorkoutLog.Note = "x"
	assert.ErrorIs(t, db.UpdateUserWorkoutLog(ctx, &stolen), database.ErrUserDoesNotHaveThisID)

	var otherView database.WorkoutLogWithSteps
	assert.ErrorIs(t, db.LoadUserWorkoutLog(ctx, otherID, logID, &otherView), database.ErrUserDoesNotHaveThisID)

	require.NoError(t, db.DeleteUserExercise(ctx, otherID, exID))
	require.NoError(t, db.DeleteUserWorkout(ctx, otherID, wID))
	require.NoError(t, db.DeleteUserWorkoutLog(ctx, otherID, logID))

	// A log saved by another user can't point at this user's workout or exercise.
	_, err = db.AddUserWorkoutLog(ctx, newTestWorkoutLog(otherID, &wID, &exID))
	require.NoError(t, err)

	var otherLogs []database.WorkoutLogWithSteps
	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, otherID, -1, &otherLogs))
	require.Len(t, otherLogs, 1)
	assert.Nil(t, otherLogs[0].WorkoutLog.WorkoutID)
	assert.Nil(t, otherLogs[0].Steps[0].ExerciseID)

	var exercises []database.ExerciseWithTags
	require.NoError(t, db.LoadUserExercises(ctx, userID, &exercises))
	assert.Len(t, exercises, 1)

	var workouts []database.WorkoutWithTags
	require.NoError(t, db.LoadUserWorkouts(ctx, userID, &workouts))
	assert.Len(t, workouts, 1)

	require.NoError(t, db.LoadUserWorkoutLogsN(ctx, userID, -1, &logs))
	require.Len(t, logs, 1)
	assert.Equal(t, "good", logs[0].WorkoutLog.Note)

	var spans []database.TaggedTimespan
	require.NoError(t, db.LoadUserTimespansWithTags(ctx, userID, &spans))
	assert.Len(t, spans, 1)
}

func testWorkoutTagMergeAndDelete(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)
	userID := getTestUser(t, db)

	ex := &database.TblUserExercise{UserID: userID, Name: "Jacks"}
	exID, err := db.AddUserExercise(ctx, ex, []database.TblUserTag{
		{Namespace: "cardio", Name: "jj"},
		{Namespace: "cardio", Name: "jumping_jack"},
	})
	require.NoError(t, err)

	_, err = db.AddUserWorkout(ctx, &database.TblUserWorkout{UserID: userID, Name: "W"}, []database.TblUserTag{
		{Namespace: "cardio", Name: "jj"},
	})
	require.NoError(t, err)

	// Merging jj into jumping_jack keeps one tag on the exercise and moves the workout's tag.
	require.NoError(t, db.UpdateUserTag(ctx, userID, "cardio", "jj", "cardio", "jumping_jack", true))

	var exercises []database.ExerciseWithTags
	require.NoError(t, db.LoadUserExercises(ctx, userID, &exercises))
	require.Len(t, exercises, 1)
	assert.Equal(t, []string{"cardio:jumping_jack"}, tagNames(exercises[0].Tags))

	var workouts []database.WorkoutWithTags
	require.NoError(t, db.LoadUserWorkouts(ctx, userID, &workouts))
	require.Len(t, workouts, 1)
	assert.Equal(t, []string{"cardio:jumping_jack"}, tagNames(workouts[0].Tags))

	// Deleting a tag in use removes it from the exercise instead of failing.
	require.NoError(t, db.DeleteUserTag(ctx, userID, "cardio", "jumping_jack"))
	require.NoError(t, db.LoadUserExercises(ctx, userID, &exercises))
	require.Len(t, exercises, 1)
	assert.Equal(t, exID, exercises[0].Exercise.ID)
	assert.Empty(t, exercises[0].Tags)
}
