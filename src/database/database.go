package database

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
)

// DB is interface for accessing and manipulating data in database.
type DB interface {
	// DBx is the underlying sqlx.DB
	DBx() *sqlx.DB

	// Migrate runs migrations for this database
	Migrate(ctx context.Context) error

	// Get the version of this database, used for migration tracking.
	GetVersion(ctx context.Context) (Version, error)

	// Sets the version of this database.
	SetVersion(ctx context.Context, version Version) error

	// Sets the version of this database using the given transaction.
	SetVersionTx(tx *sqlx.Tx, version Version) error

	// Add the given user to the database, returning their ID or error.
	// Does not edit the given struct.
	AddUser(ctx context.Context, user *TblUser) (int, error)

	// Read a user with the given ID into the given struct or returning an error.
	LoadUser(ctx context.Context, username string, user *TblUser) error

	// Read all users into the given array, or returning an error.
	LoadUsers(ctx context.Context, users *[]TblUser) error

	// Add a food and returns it's ID, or an error.
	// Does not edit the given struct.
	AddUserFood(ctx context.Context, food *TblUserFood) (int, error)

	// Add all of the given foods or none if an error.
	// Does not edit the given structs.
	AddUserFoods(ctx context.Context, food []*TblUserFood) error

	// Update the given food.
	// Does not edit the given structs.
	UpdateUserFood(ctx context.Context, food *TblUserFood) error

	// Update the given eventlog.
	// Does not edit the given structs.
	UpdateUserEventLog(ctx context.Context, food *TblUserEventLog) error

	// Delete a food by it's ID.
	DeleteUserFood(ctx context.Context, userId int, foodId int) error

	// Read all the user foods into the given array, or return an error.
	LoadUserFoods(ctx context.Context, userId int, out *[]TblUserFood) error

	// Add the given event and return it's ID, or an error.
	// Does not edit the given structs.
	AddUserEvent(ctx context.Context, event *TblUserEvent) (int, error)

	// Read the event into the given struct, or returns an error.
	LoadUserEvent(ctx context.Context, userId int, eventId int, event *TblUserEvent) error

	// Read the event with the given name into the given struct, or returns an error.
	LoadUserEventByName(ctx context.Context, userId int, name string, event *TblUserEvent) error

	// Read all the users events into the given array, or returns an error.
	LoadUserEvents(ctx context.Context, userId int, events *[]TblUserEvent) error

	// Read all the users eventlogs into the given array, or returns an error.
	LoadUserEventLogs(ctx context.Context, userId int, events *[]TblUserEventLog) error
	LoadUserEventLogsTx(tx *sqlx.Tx, userId int, events *[]TblUserEventLog) error

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

	// Read a single event log and it's food into the given array.
	// Returns an error or nil.
	LoadUserEventLogWithFoodLog(ctx context.Context, userId int, eventlogId int, eventWithFood *UserEventLogWithFoodLog) error

	// Read all the event logs and their food into the given array.
	// Returns an error or nil.
	LoadUserEventLogsWithFoodLog(ctx context.Context, userId int, eventWithFood *[]UserEventLogWithFoodLog) error

	// Add the given TblUserFoodLog to the databasea, and sets the UserTime, FoodID, and EventID, on the given food
	// Returns the TblUserFoodLog ID or an error.
	AddUserFoodLog(ctx context.Context, food *TblUserFoodLog) (int, error)
	AddUserFoodLogTx(tx *sqlx.Tx, food *TblUserFoodLog) (int, error)

	LoadUserFoodLogs(ctx context.Context, userId int, out *[]TblUserFoodLog) error

	WithTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error
	Base() *SQLxDB
}

type SQLxDB struct {
	*sqlx.DB
}

func (db *SQLxDB) Base() *SQLxDB {
	return db
}

func (db *SQLxDB) InsertOneGetID(ctx context.Context, query string, arg ...interface{}) (int, error) {

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
func (db *SQLxDB) InsertOneNamedGetIDTx(tx *sqlx.Tx, query string, arg interface{}) (int, error) {

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
func (db *SQLxDB) InsertOneNamedGetID(ctx context.Context, query string, arg interface{}) (int, error) {

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
