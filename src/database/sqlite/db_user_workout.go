package sqlite

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

// userTagIDsTx returns the IDs of the given tags, creating any that don't exist.
func (db *SqliteDatabase) userTagIDsTx(tx *sqlx.Tx, userID int, tags []database.TblUserTag) ([]int, error) {

	ids := make([]int, 0, len(tags))
	seen := make(map[int]bool, len(tags))

	for _, t := range tags {

		query := `INSERT OR IGNORE INTO PON_USER_TAG (USER_ID, NAMESPACE, NAME) VALUES ($1, $2, $3)`

		if _, err := tx.Exec(query, userID, t.Namespace, t.Name); err != nil {
			return nil, err
		}

		var id int

		query = `SELECT ID FROM PON_USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $2 AND NAME = $3`

		if err := tx.Get(&id, query, userID, t.Namespace, t.Name); err != nil {
			return nil, err
		}

		if !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}

	return ids, nil
}

// setLinkTagsTx replaces the tags in a tag link table, e.g. PON_USER_EXERCISE_TAG.
func (db *SqliteDatabase) setLinkTagsTx(
	tx *sqlx.Tx,
	userID int,
	table, ownerCol string,
	ownerID int,
	tags []database.TblUserTag,
) error {

	ids, err := db.userTagIDsTx(tx, userID, tags)

	if err != nil {
		return err
	}

	if _, err := tx.Exec(`DELETE FROM `+table+` WHERE `+ownerCol+` = $1`, ownerID); err != nil {
		return err
	}

	for _, id := range ids {

		if _, err := tx.Exec(`INSERT INTO `+table+` (`+ownerCol+`, TAG_ID) VALUES ($1, $2)`, ownerID, id); err != nil {
			return err
		}
	}

	return nil
}

// loadLinkTagsTx loads every tag in a tag link table for the user, keyed by owner ID.
func (db *SqliteDatabase) loadLinkTagsTx(
	tx *sqlx.Tx,
	userID int,
	table, ownerCol string,
) (map[int][]database.TblUserTag, error) {

	var rows []struct {
		database.TblUserTag

		OwnerID int `db:"owner_id"`
	}

	query := `
		SELECT l.` + ownerCol + ` AS OWNER_ID, t.ID, t.USER_ID, t.NAMESPACE, t.NAME
		FROM ` + table + ` l
		JOIN PON_USER_TAG t ON t.ID = l.TAG_ID
		WHERE t.USER_ID = $1
		ORDER BY t.ID
	`

	if err := tx.Select(&rows, query, userID); err != nil {
		return nil, err
	}

	out := make(map[int][]database.TblUserTag)

	for _, r := range rows {
		out[r.OwnerID] = append(out[r.OwnerID], r.TblUserTag)
	}

	return out, nil
}

func (db *SqliteDatabase) AddUserExercise(
	ctx context.Context,
	ex *database.TblUserExercise,
	tags []database.TblUserTag,
) (int, error) {

	var exerciseID int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON_USER_EXERCISE (USER_ID, NAME, NOTE)
			VALUES (:USER_ID, :NAME, :NOTE)
		`

		id, err := db.NamedInsertGetLastRowIDTx(tx, query, ex)

		if err != nil {
			return err
		}

		exerciseID = id

		return db.setLinkTagsTx(tx, ex.UserID, "PON_USER_EXERCISE_TAG", "EXERCISE_ID", id, tags)
	})

	return exerciseID, err
}

func (db *SqliteDatabase) UpdateUserExercise(
	ctx context.Context,
	ex *database.TblUserExercise,
	tags []database.TblUserTag,
) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `SELECT COUNT(ID) FROM PON_USER_EXERCISE WHERE USER_ID = $1 AND ID = $2`

		if ok, err := db.CountOneTx(tx, query, ex.UserID, ex.ID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		query = `
			UPDATE PON_USER_EXERCISE
			SET NAME = :NAME, NOTE = :NOTE
			WHERE USER_ID = :USER_ID AND ID = :ID
		`

		if _, err := tx.NamedExec(query, ex); err != nil {
			return err
		}

		return db.setLinkTagsTx(tx, ex.UserID, "PON_USER_EXERCISE_TAG", "EXERCISE_ID", ex.ID, tags)
	})
}

func (db *SqliteDatabase) DeleteUserExercise(ctx context.Context, userID int, exerciseID int) error {

	query := `DELETE FROM PON_USER_EXERCISE WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, exerciseID)

	return err
}

func (db *SqliteDatabase) LoadUserExercises(ctx context.Context, userID int, out *[]database.ExerciseWithTags) error {

	return db.WithTxRead(ctx, func(tx *sqlx.Tx) error {

		var rows []database.TblUserExercise

		query := `
			SELECT ID, USER_ID, NAME, NOTE
			FROM PON_USER_EXERCISE
			WHERE USER_ID = $1
			ORDER BY NAME ASC
		`

		if err := tx.Select(&rows, query, userID); err != nil {
			return err
		}

		tags, err := db.loadLinkTagsTx(tx, userID, "PON_USER_EXERCISE_TAG", "EXERCISE_ID")

		if err != nil {
			return err
		}

		data := make([]database.ExerciseWithTags, len(rows))

		for i, r := range rows {
			data[i].Exercise = r
			data[i].Tags = tags[r.ID]

			if data[i].Tags == nil {
				data[i].Tags = []database.TblUserTag{}
			}
		}

		*out = data

		return nil
	})
}

func (db *SqliteDatabase) AddUserWorkout(
	ctx context.Context,
	w *database.TblUserWorkout,
	tags []database.TblUserTag,
) (int, error) {

	var workoutID int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON_USER_WORKOUT (USER_ID, NAME, NOTE, STRUCTURE)
			VALUES (:USER_ID, :NAME, :NOTE, :STRUCTURE)
		`

		id, err := db.NamedInsertGetLastRowIDTx(tx, query, w)

		if err != nil {
			return err
		}

		workoutID = id

		return db.setLinkTagsTx(tx, w.UserID, "PON_USER_WORKOUT_TAG", "WORKOUT_ID", id, tags)
	})

	return workoutID, err
}

func (db *SqliteDatabase) UpdateUserWorkout(
	ctx context.Context,
	w *database.TblUserWorkout,
	tags []database.TblUserTag,
) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `SELECT COUNT(ID) FROM PON_USER_WORKOUT WHERE USER_ID = $1 AND ID = $2`

		if ok, err := db.CountOneTx(tx, query, w.UserID, w.ID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		query = `
			UPDATE PON_USER_WORKOUT
			SET NAME = :NAME, NOTE = :NOTE, STRUCTURE = :STRUCTURE
			WHERE USER_ID = :USER_ID AND ID = :ID
		`

		if _, err := tx.NamedExec(query, w); err != nil {
			return err
		}

		return db.setLinkTagsTx(tx, w.UserID, "PON_USER_WORKOUT_TAG", "WORKOUT_ID", w.ID, tags)
	})
}

func (db *SqliteDatabase) DeleteUserWorkout(ctx context.Context, userID int, workoutID int) error {

	query := `DELETE FROM PON_USER_WORKOUT WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, workoutID)

	return err
}

func (db *SqliteDatabase) LoadUserWorkouts(ctx context.Context, userID int, out *[]database.WorkoutWithTags) error {

	return db.WithTxRead(ctx, func(tx *sqlx.Tx) error {

		var rows []database.TblUserWorkout

		query := `
			SELECT ID, USER_ID, NAME, NOTE, STRUCTURE
			FROM PON_USER_WORKOUT
			WHERE USER_ID = $1
			ORDER BY NAME ASC
		`

		if err := tx.Select(&rows, query, userID); err != nil {
			return err
		}

		tags, err := db.loadLinkTagsTx(tx, userID, "PON_USER_WORKOUT_TAG", "WORKOUT_ID")

		if err != nil {
			return err
		}

		data := make([]database.WorkoutWithTags, len(rows))

		for i, r := range rows {
			data[i].Workout = r
			data[i].Tags = tags[r.ID]

			if data[i].Tags == nil {
				data[i].Tags = []database.TblUserTag{}
			}
		}

		*out = data

		return nil
	})
}

func (db *SqliteDatabase) AddUserWorkoutLog(ctx context.Context, log *database.NewWorkoutLog) (int, error) {

	var workoutlogID int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		wl := log.WorkoutLog
		userID := wl.UserID

		// A workout deleted mid-run, or not the user's, is saved as null so the run isn't lost.
		if wl.WorkoutID != nil {

			query := `SELECT COUNT(ID) FROM PON_USER_WORKOUT WHERE USER_ID = $1 AND ID = $2`

			if ok, err := db.CountOneTx(tx, query, userID, *wl.WorkoutID); err != nil {
				return err
			} else if !ok {
				wl.WorkoutID = nil
			}
		}

		query := `
			INSERT INTO PON_USER_WORKOUTLOG (
				USER_ID, WORKOUT_ID, NAME, START_TIME, STOP_TIME, PAUSED_MS, COMPLETED, NOTE
			) VALUES (
				:USER_ID, :WORKOUT_ID, :NAME, :START_TIME, :STOP_TIME, :PAUSED_MS, :COMPLETED, :NOTE
			)
		`

		id, err := db.NamedInsertGetLastRowIDTx(tx, query, &wl)

		if err != nil {
			return err
		}

		workoutlogID = id

		for _, s := range log.Steps {
			if err := db.addWorkoutLogStepTx(tx, userID, id, s); err != nil {
				return err
			}
		}

		for _, ts := range database.GroupWorkoutTimespans(userID, log.Steps) {

			query = `
				INSERT INTO PON_USER_TIMESPAN (USER_ID, START_TIME, STOP_TIME, NOTE)
				VALUES (:USER_ID, :START_TIME, :STOP_TIME, :NOTE)
			`

			tsID, err := db.NamedInsertGetLastRowIDTx(tx, query, &ts.Timespan)

			if err != nil {
				return err
			}

			if err := db.SetUserTimespanTagsTx(tx, userID, tsID, ts.Tags); err != nil {
				return err
			}

			query = `INSERT INTO PON_USER_WORKOUTLOG_TIMESPAN (WORKOUTLOG_ID, TIMESPAN_ID) VALUES ($1, $2)`

			if _, err := tx.Exec(query, id, tsID); err != nil {
				return err
			}
		}

		return nil
	})

	return workoutlogID, err
}

// addWorkoutLogStepTx inserts one step of a workout log.
func (db *SqliteDatabase) addWorkoutLogStepTx(
	tx *sqlx.Tx,
	userID, workoutlogID int,
	s database.NewWorkoutLogStep,
) error {

	step := s.Step
	step.UserID = userID
	step.WorkoutLogID = workoutlogID

	// An exercise deleted mid-run, or not the user's, is saved as null so the run isn't lost.
	if step.ExerciseID != nil {

		query := `SELECT COUNT(ID) FROM PON_USER_EXERCISE WHERE USER_ID = $1 AND ID = $2`

		if ok, err := db.CountOneTx(tx, query, userID, *step.ExerciseID); err != nil {
			return err
		} else if !ok {
			step.ExerciseID = nil
		}
	}

	step.ActualSeconds = database.SegmentsSeconds(s.Segments)

	query := `
		INSERT INTO PON_USER_WORKOUTLOG_STEP (
			USER_ID, WORKOUTLOG_ID, EXERCISE_ID, NAME, KIND, SET_NUMBER, ROUND, STEP,
			TARGET_SECONDS, TARGET_REPS, TARGET_WEIGHT, TARGET_DISTANCE,
			ACTUAL_REPS, ACTUAL_WEIGHT, ACTUAL_DISTANCE, UNIT, ACTUAL_SECONDS
		) VALUES (
			:USER_ID, :WORKOUTLOG_ID, :EXERCISE_ID, :NAME, :KIND, :SET_NUMBER, :ROUND, :STEP,
			:TARGET_SECONDS, :TARGET_REPS, :TARGET_WEIGHT, :TARGET_DISTANCE,
			:ACTUAL_REPS, :ACTUAL_WEIGHT, :ACTUAL_DISTANCE, :UNIT, :ACTUAL_SECONDS
		)
	`

	if _, err := tx.NamedExec(query, &step); err != nil {
		return err
	}

	return nil
}

func (db *SqliteDatabase) LoadUserWorkoutLogsN(
	ctx context.Context,
	userID int,
	n int,
	out *[]database.WorkoutLogWithSteps,
) error {

	return db.WithTxRead(ctx, func(tx *sqlx.Tx) error {

		var logs []database.TblUserWorkoutLog

		query := `
			SELECT ID, USER_ID, WORKOUT_ID, CREATED, NAME, START_TIME, STOP_TIME, PAUSED_MS, COMPLETED, NOTE
			FROM PON_USER_WORKOUTLOG
			WHERE USER_ID = $1
			ORDER BY START_TIME DESC
			LIMIT $2
		`

		if err := tx.Select(&logs, query, userID, n); err != nil {
			return err
		}

		var steps []database.TblUserWorkoutStepLog

		query = `
			SELECT
				ID, USER_ID, WORKOUTLOG_ID, EXERCISE_ID, NAME, KIND, SET_NUMBER, ROUND, STEP,
				TARGET_SECONDS, TARGET_REPS, TARGET_WEIGHT, TARGET_DISTANCE,
				ACTUAL_REPS, ACTUAL_WEIGHT, ACTUAL_DISTANCE, UNIT, ACTUAL_SECONDS
			FROM PON_USER_WORKOUTLOG_STEP
			WHERE USER_ID = $1 AND WORKOUTLOG_ID IN (
				SELECT ID FROM PON_USER_WORKOUTLOG WHERE USER_ID = $1 ORDER BY START_TIME DESC LIMIT $2
			)
			ORDER BY ID ASC
		`

		if err := tx.Select(&steps, query, userID, n); err != nil {
			return err
		}

		*out = database.GroupWorkoutLogSteps(logs, steps)

		return nil
	})
}

func (db *SqliteDatabase) LoadUserWorkoutLog(
	ctx context.Context,
	userID int,
	workoutlogID int,
	out *database.WorkoutLogWithSteps,
) error {

	return db.WithTxRead(ctx, func(tx *sqlx.Tx) error {

		var logs []database.TblUserWorkoutLog

		query := `
			SELECT ID, USER_ID, WORKOUT_ID, CREATED, NAME, START_TIME, STOP_TIME, PAUSED_MS, COMPLETED, NOTE
			FROM PON_USER_WORKOUTLOG
			WHERE USER_ID = $1 AND ID = $2
		`

		if err := tx.Select(&logs, query, userID, workoutlogID); err != nil {
			return err
		}

		if len(logs) == 0 {
			return database.ErrUserDoesNotHaveThisID
		}

		var steps []database.TblUserWorkoutStepLog

		query = `
			SELECT
				ID, USER_ID, WORKOUTLOG_ID, EXERCISE_ID, NAME, KIND, SET_NUMBER, ROUND, STEP,
				TARGET_SECONDS, TARGET_REPS, TARGET_WEIGHT, TARGET_DISTANCE,
				ACTUAL_REPS, ACTUAL_WEIGHT, ACTUAL_DISTANCE, UNIT, ACTUAL_SECONDS
			FROM PON_USER_WORKOUTLOG_STEP
			WHERE USER_ID = $1 AND WORKOUTLOG_ID = $2
			ORDER BY ID ASC
		`

		if err := tx.Select(&steps, query, userID, workoutlogID); err != nil {
			return err
		}

		*out = database.GroupWorkoutLogSteps(logs, steps)[0]

		return nil
	})
}

func (db *SqliteDatabase) UpdateUserWorkoutLog(ctx context.Context, log *database.WorkoutLogWithSteps) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		wl := log.WorkoutLog

		query := `SELECT COUNT(ID) FROM PON_USER_WORKOUTLOG WHERE USER_ID = $1 AND ID = $2`

		if ok, err := db.CountOneTx(tx, query, wl.UserID, wl.ID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		query = `UPDATE PON_USER_WORKOUTLOG SET NOTE = $1 WHERE USER_ID = $2 AND ID = $3`

		if _, err := tx.Exec(query, wl.Note, wl.UserID, wl.ID); err != nil {
			return err
		}

		query = `
			UPDATE PON_USER_WORKOUTLOG_STEP
			SET ACTUAL_REPS = $1, ACTUAL_WEIGHT = $2, ACTUAL_DISTANCE = $3
			WHERE WORKOUTLOG_ID = $4 AND ID = $5
		`

		for _, st := range log.Steps {

			if _, err := tx.Exec(query, st.ActualReps, st.ActualWeight, st.ActualDistance, wl.ID, st.ID); err != nil {
				return err
			}
		}

		return nil
	})
}

func (db *SqliteDatabase) DeleteUserWorkoutLog(ctx context.Context, userID int, workoutlogID int) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			DELETE FROM PON_USER_TIMESPAN
			WHERE USER_ID = $1 AND ID IN (
				SELECT TIMESPAN_ID FROM PON_USER_WORKOUTLOG_TIMESPAN WHERE WORKOUTLOG_ID = $2
			)
		`

		if _, err := tx.Exec(query, userID, workoutlogID); err != nil {
			return err
		}

		query = `DELETE FROM PON_USER_WORKOUTLOG WHERE USER_ID = $1 AND ID = $2`

		_, err := tx.Exec(query, userID, workoutlogID)

		return err
	})
}
