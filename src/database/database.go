package database

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/vinovest/sqlx"
)

var (
	ErrInvalidSessionTokenLength = errors.New("user session token must be 32 length")
	ErrUserDoesNotHaveThisID     = errors.New("ID does not exist")
	ErrFoodPortionIsZero         = errors.New("food portion cannot be zero")
	ErrTagAlreadyExists          = errors.New("a tag with the new namespace and name already exists")
	ErrInvalidBodyMetric         = errors.New("body metric does not exist for this user")
)

// DB is interface for accessing and manipulating data in database.
type DB interface {

	// DBx is the underlying sqlx.DB
	DBx() *sqlx.DB
	Base() *SQLxDB

	WithTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error

	// WithTxRead runs fn in a read-only transaction where every query sees the same snapshot of the data.
	// Use it for loads that run more than one query.
	WithTxRead(ctx context.Context, fn func(tx *sqlx.Tx) error) error

	///
	/// Export functions
	///

	ExportUserCSV(ctx context.Context, w io.Writer) error
	ExportUserEventsCSV(ctx context.Context, w io.Writer) error
	ExportUserEventLogsCSV(ctx context.Context, w io.Writer) error
	ExportUserFoodsCSV(ctx context.Context, w io.Writer) error
	ExportUserFoodLogsCSV(ctx context.Context, w io.Writer) error
	ExportBodyLogCSV(ctx context.Context, w io.Writer) error
	ExportVersionCSV(ctx context.Context, w io.Writer) error

	// Migrate runs migrations for this database
	Migrate(ctx context.Context) error

	// Gets the version we can migrate too.
	GetMigrationMaxVersion() Version

	// Get the version of this database, used for migration tracking.
	// If an error is returned, the version returned should not be used.
	GetVersion(ctx context.Context) (Version, error)

	// Sets the version of this database.
	SetVersion(ctx context.Context, version Version) error

	// Sets the version of this database using the given transaction.
	SetVersionTx(tx *sqlx.Tx, version Version) error

	///
	/// User Functions
	///

	// Add the given user to the database, returning their ID or error.
	// Does not edit the given struct.
	AddUser(ctx context.Context, user *TblUser) (int, error)

	// Update the user's information with this data.
	UpdateUser(ctx context.Context, user *TblUser) error

	// Returns true if the username is taken by a user whose ID is not the given ID.
	// Returns false if the username is not taken by a user whose ID is not the given ID.
	// Returns an error otherwise.
	UsernameTaken(ctx context.Context, userID int, username string) (bool, error)

	// Returns true if at least one user exists in the database, regardless of name.
	HasAnyUser(ctx context.Context) (bool, error)

	// Read a user with the given ID into the given struct or returning an error.
	LoadUser(ctx context.Context, username string, user *TblUser) error
	LoadUserByID(ctx context.Context, id int, user *TblUser) error

	// Load a session by the given token in the database.
	// The token must be 32 bytes in size.
	LoadUserSession(ctx context.Context, token []byte, session *TblUserSession) error

	// Read all user session for the given user.
	LoadUserSessions(ctx context.Context, userID int, session *[]TblUserSession) error

	AddUserSession(ctx context.Context, session *TblUserSession) error

	DeleteUserSessionByToken(ctx context.Context, token []byte) error
	// Delete a session belonging to the given user identified by the token hash.
	// The token must be 32 bytes in size.
	DeleteUserSessionByUserAndToken(ctx context.Context, userID int, token []byte) error
	// Delete all user sessions where the expire time is less than the given time.
	DeleteUserSessionsExpireAfter(ctx context.Context, time time.Time) error
	// Update the user_agent field for a session belonging to the given user.
	// The token must be 32 bytes in size.
	UpdateUserSessionUserAgent(ctx context.Context, userID int, token []byte, userAgent string) error

	///
	/// Food Functions
	///

	// Add a food and returns it's ID, or an error.
	// Does not edit the given struct.
	AddUserFood(ctx context.Context, food *TblUserFood) (int, error)

	// Add all of the given foods or none if an error.
	// Does not edit the given structs.
	AddUserFoods(ctx context.Context, food []TblUserFood) error

	// Read all the user foods into the given array, or return an error.
	LoadUserFoods(ctx context.Context, userID int, out *[]TblUserFood) error

	// Update the given food.
	// Does not edit the given structs.
	UpdateUserFood(ctx context.Context, food *TblUserFood) error

	// Delete a food by it's ID.
	DeleteUserFood(ctx context.Context, userID int, foodID int) error

	///
	/// Event Functions
	///

	// Add the given event and return it's ID, or an error.
	// Does not edit the given structs.
	AddUserEvent(ctx context.Context, event *TblUserEvent) (int, error)

	// Read the event into the given struct, or returns an error.
	LoadUserEvent(ctx context.Context, userID int, eventID int, event *TblUserEvent) error

	// Read the event with the given name into the given struct, or returns an error.
	LoadUserEventByName(ctx context.Context, userID int, name string, event *TblUserEvent) error

	// Read all the users events into the given array, or returns an error.
	LoadUserEvents(ctx context.Context, userID int, events *[]TblUserEvent) error

	// Load or creates and then loads the event with the given name into the output, or returns an error.
	LoadAndOrCreateUserEventByNameTx(tx *sqlx.Tx, userID int, name string, out *TblUserEvent) error

	///
	/// Eventlog Functions
	///

	// Add the given event log to the database with the given transaction.
	// Returns the created ID or an error.
	// Does not edit the given struct.
	AddUserEventLogTx(tx *sqlx.Tx, event *TblUserEventLog) (int, error)

	// Add the given event log to the database.
	// If the TblUserEventLog.UserTime IsZero it is set as the current UTC time.
	// The given TblUserEventLog.NetCarbs is updated with the net carbs of the given foods.
	// The given foods are updated with the event's UserID, Event, EventLogID.
	// The given foods UserTime are updated if their usertime IsZero.
	// The given foods ID are updated.
	// The given foods are also updated by any modifications made by AddUserFoodLogTx.
	AddUserEventLogWith(ctx context.Context, event *TblUserEventLog, foodlogs []TblUserFoodLog) (int, error)

	// Read all the users eventlogs into the given array, or returns an error.
	LoadUserEventLogs(ctx context.Context, userID int, events *[]TblUserEventLog) error
	LoadUserEventLogsTx(tx *sqlx.Tx, userID int, events *[]TblUserEventLog) error

	// Delete the eventlog with the given ID.
	DeleteUserEventLog(ctx context.Context, userID int, eventlogID int) error

	///
	/// EventFoodLog Functions
	///

	// Read a single event log and it's food into the given array.
	// Returns an error or nil.
	LoadUserEventFoodLog(ctx context.Context, userID int, eventlogID int, eflog *UserEventFoodLog) error

	// Read all the event logs and their food into the given array.
	// Returns an error or nil.
	LoadUserEventFoodLogs(ctx context.Context, userID int, eflogs *[]UserEventFoodLog) error

	// Read at most n event logs and their food into the given array.
	// Returns an error or nil.
	LoadUserEventFoodLogsN(ctx context.Context, userID int, n int, eflogs *[]UserEventFoodLog) error

	// Update the given eventlog, removing the foodlogs and creating new ones from this struct.
	// The given struct is updated with proper EventID, FoodID, and UserTime.
	UpdateUserEventFoodLog(ctx context.Context, eflog *UpdateUserEventLog) error

	///
	/// Foodlog Functions
	///

	// Add the given TblUserFoodLog to the database.
	// Sets the UserTime, FoodID, and EventID, on the given food
	// If the EventID is null or 0, loads or creates the event based off the name.
	// Loads or creates the given food.
	// Returns the TblUserFoodLog ID or an error.
	AddUserFoodLogTx(tx *sqlx.Tx, food *TblUserFoodLog) (int, error)

	///
	/// Bodylog Functions
	///

	// Loads all the users bodylogs, along with their metric values, into the given array.
	LoadUserBodyLogs(ctx context.Context, userID int, out *[]UserBodyLog) error

	// Add the given bodylog, along with its metric values, to the db.
	// Every metric referenced must already exist for the log's user, otherwise
	// ErrInvalidBodyMetric is returned.
	AddUserBodyLogs(ctx context.Context, log *UserBodyLog) (int, error)

	// Update the given bodylog and replace its metric values in the db.
	// Every metric referenced must already exist for the log's user, otherwise
	// ErrInvalidBodyMetric is returned.
	UpdateUserBodyLog(ctx context.Context, log *UserBodyLog) error

	// Delete the given bodylog with the user ID and row ID.
	DeleteUserBodyLog(ctx context.Context, userID int, bodyLogID int) error

	///
	/// Body Metric Functions
	///

	// Loads all the body metrics the user has defined into the given array.
	LoadUserBodyMetrics(ctx context.Context, userID int, out *[]TblUserBodyMetric) error

	// Add the given body metric definition to the db.
	AddUserBodyMetric(ctx context.Context, metric *TblUserBodyMetric) (int, error)

	// Delete the given body metric definition with the user ID and row ID.
	DeleteUserBodyMetric(ctx context.Context, userID int, bodyMetricID int) error

	///
	/// Data Source Functions
	///
	AddDataSource(ctx context.Context, ds *TblDataSource) (int, error)
	LoadDataSources(ctx context.Context, ds *[]TblDataSource) error
	LoadDataSourceByName(ctx context.Context, name string, ds *TblDataSource) error

	///
	/// Data Source Food Functions
	///
	AddDataSourceFood(ctx context.Context, ds *TblDataSourceFood) (int, error)

	// Loads all food in the datasource where the name is similar to the given name.
	// Similarity is database-dependent:
	//  - On Postgres this is using the trgm extension https://www.postgresql.org/docs/current/pgtrgm.html#PGTRGM-INDEX
	LoadDataSourceFoodBySimilarName(
		ctx context.Context,
		dataSourceID int,
		nameQuery string,
		out *[]TblDataSourceFood,
	) error
	LoadDataSourceFoodBySimilarNameN(
		ctx context.Context,
		dataSourceID int,
		nameQuery string,
		n int,
		out *[]TblDataSourceFood,
	) error

	///
	/// User Goals
	///

	DeleteUserGoal(ctx context.Context, userID int, goalID int) error
	LoadUserGoals(ctx context.Context, userID int, out *[]TblUserGoal) error
	AddUserGoal(ctx context.Context, userGoal *TblUserGoal) (int, error)
	UpdateUserGoal(ctx context.Context, userGoal *TblUserGoal) error

	///
	/// User Tags
	///

	AddUserTag(ctx context.Context, tag *TblUserTag) (int, error)
	DeleteUserTag(ctx context.Context, userID int, namespace, name string) error

	// GetOrCreateUserTag returns the ID of the tag (userID, namespace, name), creating it if it
	// does not already exist.
	GetOrCreateUserTag(ctx context.Context, userID int, namespace, name string) (int, error)

	// UpdateUserTag renames the tag (userID, namespace, name) to (newNamespace, newName).
	// If a tag already exists at (newNamespace, newName):
	//   - if merge is false, ErrTagAlreadyExists is returned and nothing is changed.
	//   - if merge is true, all usages of the renamed tag are reassigned to the existing tag
	//     (de-duplicating any usages that already reference both), and the renamed tag is deleted.
	UpdateUserTag(ctx context.Context, userID int, namespace, name, newNamespace, newName string, merge bool) error
	LoadUserTags(ctx context.Context, userID int, out *[]TblUserTag) error
	LoadUserTagNamespaces(ctx context.Context, userID int, out *[]string) error
	LoadUserNamespaceTags(ctx context.Context, userID int, namespace string, out *[]TblUserTag) error

	// LoadUserNamespaceTagsLike loads at most n tags from the given namespace that start with the given tagNameLike.
	// Returns error for any failures.
	LoadUserNamespaceTagsLikeN(
		ctx context.Context,
		userID int,
		namespace, tagNameLike string,
		n int,
		out *[]TblUserTag,
	) error

	///
	/// User Timespan
	///

	// AddUserTimespan Adds a new timespan to the database.
	// If given, adds any tags and associates them with the timespan.
	// Returns the timespan ID or an error.
	AddUserTimespan(ctx context.Context, ts *TblUserTimespan, tags []TblUserTag) (int, error)

	DeleteUserTimespan(ctx context.Context, userID int, tsID int) error
	UpdateUserTimespan(ctx context.Context, ts *TblUserTimespan) error
	LoadUserTimespans(ctx context.Context, userID int, out *[]TblUserTimespan) error
	LoadUserTimespansN(ctx context.Context, userID int, n int, out *[]TblUserTimespan) error
	LoadUserTimespansWithTags(ctx context.Context, userID int, out *[]TaggedTimespan) error
	LoadUserTimespansWithTagsN(ctx context.Context, userID int, n int, out *[]TaggedTimespan) error

	// SetUserTimespanTags removes all tags from the timestamp and sets the given tags onto it.
	// Any tags that do not exist are created for the given userID.
	// Returns an error for any failures.
	SetUserTimespanTags(ctx context.Context, userID, timespanID int, tags []TblUserTag) error

	///
	/// User Activity
	///

	// AddUserActivity adds a new activity definition and returns its ID, or an error.
	// Does not edit the given struct.
	AddUserActivity(ctx context.Context, activity *TblUserActivity) (int, error)

	// LoadUserActivities loads all activity definitions owned by the given user,
	// with each activity's resolved tag embedded.
	LoadUserActivities(ctx context.Context, userID int, out *[]ActivityWithTag) error

	// UpdateUserActivity updates the given activity. Does not edit the given struct.
	UpdateUserActivity(ctx context.Context, activity *TblUserActivity) error

	// DeleteUserActivity deletes an activity by its ID, scoped to the owning user.
	DeleteUserActivity(ctx context.Context, userID int, activityID int) error

	///
	/// User Exercise
	///

	// AddUserExercise adds a new exercise with the given tags and returns its ID.
	// Tags that don't exist are created. Does not edit the given struct.
	AddUserExercise(ctx context.Context, ex *TblUserExercise, tags []TblUserTag) (int, error)

	// UpdateUserExercise updates the exercise and replaces its tags. Does not edit the given struct.
	UpdateUserExercise(ctx context.Context, ex *TblUserExercise, tags []TblUserTag) error

	// DeleteUserExercise deletes an exercise by its ID, scoped to the owning user.
	// Workout log steps using it keep their snapshot with a null exercise ID.
	DeleteUserExercise(ctx context.Context, userID int, exerciseID int) error

	// LoadUserExercises loads all of the user's exercises with their tags, ordered by name.
	LoadUserExercises(ctx context.Context, userID int, out *[]ExerciseWithTags) error

	///
	/// User Workout
	///

	// AddUserWorkout adds a new workout with the given tags and returns its ID.
	// Tags that don't exist are created. Does not edit the given struct.
	AddUserWorkout(ctx context.Context, w *TblUserWorkout, tags []TblUserTag) (int, error)

	// UpdateUserWorkout updates the workout and replaces its tags. Does not edit the given struct.
	UpdateUserWorkout(ctx context.Context, w *TblUserWorkout, tags []TblUserTag) error

	// DeleteUserWorkout deletes a workout by its ID, scoped to the owning user.
	// Workout logs of it are kept with a null workout ID.
	DeleteUserWorkout(ctx context.Context, userID int, workoutID int) error

	// LoadUserWorkouts loads all of the user's workouts with their tags, ordered by name.
	LoadUserWorkouts(ctx context.Context, userID int, out *[]WorkoutWithTags) error

	///
	/// User Workout Log
	///

	// AddUserWorkoutLog adds a workout log and its steps in one transaction, and returns the log ID.
	// For each step with tags, one timespan per segment is created with those tags and linked to the log.
	// All rows are saved with the log's UserID. Does not edit the given struct.
	AddUserWorkoutLog(ctx context.Context, log *NewWorkoutLog) (int, error)

	// LoadUserWorkoutLogsN loads the user's n most recent workout logs with their steps.
	// Steps are in the order they were saved. If n < 0, all logs are loaded.
	LoadUserWorkoutLogsN(ctx context.Context, userID int, n int, out *[]WorkoutLogWithSteps) error

	// LoadUserWorkoutLog loads one workout log with its steps.
	// Returns ErrUserDoesNotHaveThisID if the user has no log with that ID.
	LoadUserWorkoutLog(ctx context.Context, userID int, workoutlogID int, out *WorkoutLogWithSteps) error

	// UpdateUserWorkoutLog updates the log's note and each step's actuals, matched by step ID.
	// Nothing else is changed, including timespans. Returns ErrUserDoesNotHaveThisID if the
	// log does not belong to the log's UserID.
	UpdateUserWorkoutLog(ctx context.Context, log *WorkoutLogWithSteps) error

	// DeleteUserWorkoutLog deletes a workout log, its steps, and the timespans it created.
	DeleteUserWorkoutLog(ctx context.Context, userID int, workoutlogID int) error

	///
	/// User Reminder
	///

	// AddUserReminder adds a new reminder and links it to the given activityIDs,
	// which must already exist and belong to userID. Returns the reminder ID or an error.
	AddUserReminder(ctx context.Context, r *TblUserReminder, activityIDs []int) (int, error)

	// LoadUserReminders loads all reminders owned by the given user, with each
	// reminder's linked activities (and their resolved tags) embedded.
	LoadUserReminders(ctx context.Context, userID int, out *[]ReminderWithActivities) error

	// UpdateUserReminder updates the reminder's Enabled/IntervalMinutes/LastActivityAt/Cron
	// fields. Does not edit the given struct. Also used for skip/snooze, where the
	// caller computes the new LastActivityAt.
	UpdateUserReminder(ctx context.Context, r *TblUserReminder) error

	// SetUserReminderActivities replaces the set of activities linked to a reminder.
	// All activityIDs must belong to userID, or ErrUserDoesNotHaveThisID is returned.
	SetUserReminderActivities(ctx context.Context, userID, reminderID int, activityIDs []int) error

	// DeleteUserReminder deletes a reminder by its ID, scoped to the owning user.
	DeleteUserReminder(ctx context.Context, userID int, reminderID int) error

	// LoadUserDashboards loads all dashboards owned by the given user.
	LoadUserDashboards(ctx context.Context, userID int, out *[]TblUserDashboard) error

	// AddUserDashboard inserts a new dashboard row and returns its generated ID.
	AddUserDashboard(ctx context.Context, dashboard *TblUserDashboard) (int, error)

	// UpdateUserDashboard updates the name and data of an existing dashboard.
	// The update is scoped to the owning user so one user cannot modify another's rows.
	UpdateUserDashboard(ctx context.Context, dashboard *TblUserDashboard) error

	// DeleteUserDashboard removes a dashboard by ID, scoped to the owning user.
	DeleteUserDashboard(ctx context.Context, userID, dashboardID int) error

	// LoadUserTagColors loads all namespace-color mappings for the given user.
	LoadUserTagColors(ctx context.Context, userID int, out *[]TblUserTagColor) error

	// SetUserTagColors upserts a namespace-color mapping for the given user.
	SetUserTagColors(ctx context.Context, colors []TblUserTagColor) error

	// DeleteUserTagColor removes the color mapping for the given namespace.
	DeleteUserTagColors(ctx context.Context, userID int, namespace []string) error

	///
	/// User Photo Functions
	///

	// AddUserPhoto saves the photo blob for the given user and returns its ID.
	AddUserPhoto(ctx context.Context, photo *TblUserPhoto) (int, error)

	// AddUserEventLogPhotos creates mappings between an event log and a list of photo IDs.
	AddUserEventLogPhotos(ctx context.Context, eventlogID int, photoIDs []int) error

	// dayOffset is the user's DayTimeOffsetSeconds (see ParseRelativeTimeExpr) marking when
	// their day starts; bucket boundaries for day/week/month/year groupings are shifted by
	// this amount so they align with the user's perceived day rather than local midnight.
	LoadUserTimeData(
		ctx context.Context,
		userID int,
		startTime time.Time,
		endTime time.Time,
		tags []string,
		aggregation AggregationFunc,
		groupby GroupBy,
		timezone Timezone,
		dayOffset time.Duration,
		out *[]TimespanTagDurationPoint,
	) error

	// LoadUserBodyLogTimeData buckets and aggregates a user's recorded body metric values
	// over time, analogous to LoadUserTimeData for timespans. metricNames filters to the
	// named body metrics (see TblUserBodyMetric.Name); dayOffset has the same meaning as in
	// LoadUserTimeData.
	LoadUserBodyLogTimeData(
		ctx context.Context,
		userID int,
		startTime time.Time,
		endTime time.Time,
		metricNames []string,
		aggregation AggregationFunc,
		groupby GroupBy,
		timezone Timezone,
		dayOffset time.Duration,
		out *[]BodyLogMetricPoint,
	) error

	// LoadUserMacrosTimeData buckets and aggregates a user's recorded nutrition data values
	// over time, analogous to LoadUserTimeData for timespans. metricNames filters to the
	// named body metrics (see TblUserBodyMetric.Name); dayOffset has the same meaning as in
	// LoadUserTimeData.
	LoadUserMacrosTimeData(
		ctx context.Context,
		userID int,
		startTime time.Time,
		endTime time.Time,
		calorieCalc CalorieCalcMethod,
		aggregation AggregationFunc,
		groupby GroupBy,
		timezone Timezone,
		dayOffset time.Duration,
		out *[]MacronutrientPoint,
	) error

	// LoadUserEventLogTimeData buckets and aggregates a user's recorded eventlog values
	// (net carbs, blood glucose, and insulin dosing fields) over time, analogous to
	// LoadUserTimeData for timespans. dayOffset has the same meaning as in LoadUserTimeData.
	LoadUserEventLogTimeData(
		ctx context.Context,
		userID int,
		startTime time.Time,
		endTime time.Time,
		aggregation AggregationFunc,
		groupby GroupBy,
		timezone Timezone,
		dayOffset time.Duration,
		out *[]EventLogPoint,
	) error
}

type SQLxDB struct {
	*sqlx.DB
}

func (db *SQLxDB) Base() *SQLxDB {
	return db
}

// BackslashEscapePattern escapes the LIKE pattern matching using the \ character.
// For use in queries as LIKE $1 ESCAPE '\'.
func (db *SQLxDB) BackslashEscapePattern(s string) string {

	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)

	return s
}

// CountOneTx returns ok, err where ok indicates the query returned a single column with the value of 1.
func (db *SQLxDB) CountOneTx(tx *sqlx.Tx, query string, arg ...any) (bool, error) {

	var rowCount int

	if err := tx.Get(&rowCount, query, arg...); err != nil {
		return false, err
	}

	return rowCount == 1, nil
}

func (db *SQLxDB) InsertReturningID(ctx context.Context, query string, arg ...any) (int, error) {

	rows, err := db.QueryContext(ctx, query, arg...)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var id int
	// Retrieve the auto-generated ID
	if rows.Next() {
		if err := rows.Err(); err != nil {
			return 0, err
		}
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}

	return id, nil
}

func (db *SQLxDB) NamedInsertReturningIDTx(tx *sqlx.Tx, query string, arg any) (int, error) {

	rows, err := tx.NamedQuery(query, arg)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var id int
	// Retrieve the auto-generated ID
	if rows.Next() {
		if err := rows.Err(); err != nil {
			return 0, err
		}
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}

	return id, nil
}

func (db *SQLxDB) NamedInsertReturningID(ctx context.Context, query string, arg any) (int, error) {

	rows, err := db.NamedQueryContext(ctx, query, arg)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var id int
	// Retrieve the auto-generated ID
	if rows.Next() {
		if err := rows.Err(); err != nil {
			return 0, err
		}
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}

	return id, nil
}

func (db *SQLxDB) NamedInsertGetLastRowIDTx(tx *sqlx.Tx, query string, arg any) (int, error) {

	rows, err := tx.NamedExec(query, arg)

	if err != nil {
		return 0, err
	}

	id, err := rows.LastInsertId()

	return int(id), err
}

func (db *SQLxDB) NamedInsertGetLastRowID(ctx context.Context, query string, arg any) (int, error) {

	rows, err := db.NamedExecContext(ctx, query, arg)

	if err != nil {
		return 0, err
	}

	id, err := rows.LastInsertId()

	return int(id), err
}

func (db *SQLxDB) WithTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	return db.WithTxOpts(ctx, nil, fn)
}

// WithTxOpts is WithTx with the given transaction options, nil for the defaults.
func (db *SQLxDB) WithTxOpts(ctx context.Context, opts *sql.TxOptions, fn func(tx *sqlx.Tx) error) error {

	log := zerolog.Ctx(ctx)

	tx, err := db.BeginTxx(ctx, opts)

	if err != nil {
		return fmt.Errorf("could not begin transaction: %w", err)
	}

	err = fn(tx)

	if err != nil {

		log.Error().Err(err).Msg("error running transaction function")

		rollbackErr := tx.Rollback()

		if rollbackErr != nil {
			log.Error().Err(rollbackErr).Msg("error during rollback")
		}

		return errors.WithStack(err)
	}

	err = tx.Commit()

	if err != nil {
		log.Error().Err(err).Msg("error during commit")
	}

	return err
}

func (db *SQLxDB) ExportQueryRowsAsCsv(ctx context.Context, query string, w io.Writer) error {

	rows, err := db.QueryxContext(ctx, query)

	if err != nil {
		return err
	}
	defer rows.Close()

	return db.WriteRowsAsCsv(rows, w)
}

func (db *SQLxDB) WriteRowsAsCsv(rows *sqlx.Rows, w io.Writer) error {

	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	cols, err := rows.Columns()

	if err != nil {
		return err
	}

	if err := csvWriter.Write(cols); err != nil {
		return err
	}

	csvRow := make([]string, len(cols))

	for rows.Next() {

		row := make(map[string]any)

		if err := rows.MapScan(row); err != nil {
			return err
		}

		for i, col := range cols {
			csvRow[i] = ValueToString(row[col])
		}

		if err := csvWriter.Write(csvRow); err != nil {
			return err
		}
	}

	return rows.Err()
}
