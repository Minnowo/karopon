package database

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
)

// DB is interface for accessing and manipulating data in database.
type DB interface {

	// DBx is the underlying sqlx.DB
	DBx() *sqlx.DB
	Base() *SQLxDB

	WithTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error

	///
	/// Export functions
	///

	ExportUserCSV(ctx context.Context, w io.Writer) error
	ExportUserEventsCSV(ctx context.Context, w io.Writer) error
	ExportUserEventLogsCSV(ctx context.Context, w io.Writer) error
	ExportUserFoodsCSV(ctx context.Context, w io.Writer) error
	ExportUserFoodLogsCSV(ctx context.Context, w io.Writer) error
	ExportBodyLogCSV(ctx context.Context, w io.Writer) error
	ExportDbVersionCSV(ctx context.Context, w io.Writer) error

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

	// Returns true if the username is taken by another user or false if it's not.
	// Returns an error otherwise.
	UsernameTaken(ctx context.Context, userId int, username string) (bool, error)

	// Read a user with the given ID into the given struct or returning an error.
	LoadUser(ctx context.Context, username string, user *TblUser) error
	LoadUserById(ctx context.Context, id int, user *TblUser) error

	// Read all users into the given array, or returning an error.
	LoadUsers(ctx context.Context, users *[]TblUser) error

	// Load a session by the given token in the database.
	// The token must be 32 bytes in size.
	LoadUserSession(ctx context.Context, token []byte, session *TblUserSession) error

	// Read all user session for the given user.
	LoadUserSessions(ctx context.Context, userId int, session *[]TblUserSession) error

	AddUserSession(ctx context.Context, session *TblUserSession) error

	DeleteUserSessionByToken(ctx context.Context, token []byte) error
	// Delete all user sessions where the expire time is less than the given time.
	DeleteUserSessionsExpireAfter(ctx context.Context, time time.Time) error

	///
	/// Food Functions
	///

	// Add a food and returns it's ID, or an error.
	// Does not edit the given struct.
	AddUserFood(ctx context.Context, food *TblUserFood) (int, error)

	// Add all of the given foods or none if an error.
	// Does not edit the given structs.
	AddUserFoods(ctx context.Context, food []*TblUserFood) error

	// Read all the user foods into the given array, or return an error.
	LoadUserFoods(ctx context.Context, userId int, out *[]TblUserFood) error

	// Update the given food.
	// Does not edit the given structs.
	UpdateUserFood(ctx context.Context, food *TblUserFood) error

	// Delete a food by it's ID.
	DeleteUserFood(ctx context.Context, userId int, foodId int) error

	///
	/// Event Functions
	///

	// Add the given event and return it's ID, or an error.
	// Does not edit the given structs.
	AddUserEvent(ctx context.Context, event *TblUserEvent) (int, error)

	// Read the event into the given struct, or returns an error.
	LoadUserEvent(ctx context.Context, userId int, eventId int, event *TblUserEvent) error

	// Read the event with the given name into the given struct, or returns an error.
	LoadUserEventByName(ctx context.Context, userId int, name string, event *TblUserEvent) error

	// Read all the users events into the given array, or returns an error.
	LoadUserEvents(ctx context.Context, userId int, events *[]TblUserEvent) error

	// Load or creates and then loads the event with the given name into the output, or returns an error.
	LoadAndOrCreateUserEventByNameTx(tx *sqlx.Tx, userId int, name string, out *TblUserEvent) error

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
	LoadUserEventLogs(ctx context.Context, userId int, events *[]TblUserEventLog) error
	LoadUserEventLogsTx(tx *sqlx.Tx, userId int, events *[]TblUserEventLog) error

	// Delete the eventlog with the given ID.
	// If deleteFoodLogs is true, also delete any associated foodlogs.
	DeleteUserEventLog(ctx context.Context, userId int, eventlogId int, deleteFoodLogs bool) error

	///
	/// EventFoodLog Functions
	///

	// Read a single event log and it's food into the given array.
	// Returns an error or nil.
	LoadUserEventFoodLog(ctx context.Context, userId int, eventlogId int, eflog *UserEventFoodLog) error

	// Read all the event logs and their food into the given array.
	// Returns an error or nil.
	LoadUserEventFoodLogs(ctx context.Context, userId int, eflogs *[]UserEventFoodLog) error

	// Read at most n event logs and their food into the given array.
	// Returns an error or nil.
	LoadUserEventFoodLogsN(ctx context.Context, userId int, n int, eflogs *[]UserEventFoodLog) error

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
	AddUserFoodLog(ctx context.Context, food *TblUserFoodLog) (int, error)
	AddUserFoodLogTx(tx *sqlx.Tx, food *TblUserFoodLog) (int, error)

	LoadUserFoodLogs(ctx context.Context, userId int, out *[]TblUserFoodLog) error

	///
	/// Bodylog Functions
	///

	// Loads all the users bodylogs inot the given array.
	LoadUserBodyLogs(ctx context.Context, userId int, out *[]TblUserBodyLog) error

	// Add the given bodylog to the db.
	AddUserBodyLogs(ctx context.Context, log *TblUserBodyLog) (int, error)

	// Delete the given bodylog with the user ID and row ID.
	DeleteUserBodyLog(ctx context.Context, userId int, bodyLogId int) error

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
	LoadDataSourceFoodBySimilarName(ctx context.Context, dataSourceID int, nameQuery string, out *[]TblDataSourceFood) error
	LoadDataSourceFoodBySimilarNameN(ctx context.Context, dataSourceID int, nameQuery string, n int, out *[]TblDataSourceFood) error

	///
	/// User Goals
	///

	DeleteUserGoal(ctx context.Context, userId int, goalId int) error
	LoadUserGoals(ctx context.Context, userId int, out *[]TblUserGoal) error
	AddUserGoal(ctx context.Context, userGoal *TblUserGoal) (int, error)
	LoadUserGoalProgress(ctx context.Context, curTime time.Time, userGoal *TblUserGoal, out *UserGoalProgress) error

	///
	/// User Tags
	///

	AddUserTag(ctx context.Context, tag *TblUserTag) (int, error)
	LoadUserTags(ctx context.Context, userId int, out *[]TblUserTag) error
	LoadUserTagNamespaces(ctx context.Context, userId int, out *[]string) error
	LoadUserNamespaceTags(ctx context.Context, userId int, namespace string, out *[]TblUserTag) error

	// LoadUserNamespaceTagsLike loads at most n tags from the given namespace that start with the given tagNameLike.
	// Returns error for any failures.
	LoadUserNamespaceTagsLikeN(ctx context.Context, userId int, namespace, tagNameLike string, n int, out *[]TblUserTag) error

	///
	/// User Timespan
	///

	// AddUserTimespan Adds a new timespan to the database.
	// If given, adds any tags and associates them with the timespan.
	// Returns the timespan ID or an error.
	AddUserTimespan(ctx context.Context, ts *TblUserTimespan, tags []TblUserTag) (int, error)

	DeleteUserTimespan(ctx context.Context, userId int, tsId int) error
	UpdateUserTimespan(ctx context.Context, ts *TblUserTimespan) error
	LoadUserTimespans(ctx context.Context, userId int, out *[]TblUserTimespan) error
	LoadUserTimespansWithTags(ctx context.Context, userId int, out *[]TaggedTimespan) error

	// SetUserTimespanTags removes all tags from the timestamp and sets the given tags onto it.
	// Any tags that do not exist are created for the given userId.
	// Returns an error for any failures.
	SetUserTimespanTags(ctx context.Context, userId, timespanId int, tags []TblUserTag) error
}

type SQLxDB struct {
	*sqlx.DB
}

func (db *SQLxDB) Base() *SQLxDB {
	return db
}

// BackslashEscapePattern escapes the LIKE pattern matching using the \ character.
// For use in queries as LIKE $1 ESCAPE '\'
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

func (db *SQLxDB) InsertOneGetID(ctx context.Context, query string, arg ...any) (int, error) {

	rows, err := db.QueryContext(ctx, query, arg...)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var id int
	// Retrieve the auto-generated ID
	if rows.Next() {
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}

	return id, nil
}

func (db *SQLxDB) InsertOneNamedGetIDTx(tx *sqlx.Tx, query string, arg any) (int, error) {

	rows, err := tx.NamedQuery(query, arg)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var id int
	// Retrieve the auto-generated ID
	if rows.Next() {
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}

	return id, nil
}

func (db *SQLxDB) InsertOneNamedGetID(ctx context.Context, query string, arg any) (int, error) {

	rows, err := db.NamedQueryContext(ctx, query, arg)

	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var id int
	// Retrieve the auto-generated ID
	if rows.Next() {
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
	}

	return id, nil
}

func (db *SQLxDB) WithTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error {

	log := zerolog.Ctx(ctx)

	tx, err := db.BeginTxx(ctx, nil)

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
