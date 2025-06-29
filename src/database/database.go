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

	GetVersion(ctx context.Context) (Version, error)
	SetVersion(ctx context.Context, version Version) error
	SetVersionTx(tx *sqlx.Tx, version Version) error

	AddUser(ctx context.Context, user *TblUser) (int, error)
	LoadUser(ctx context.Context, username string, user *TblUser) error
	LoadUsers(ctx context.Context, users *[]TblUser) error

	AddUserFood(ctx context.Context, food *TblUserFood) (int, error)
	AddUserFoods(ctx context.Context, food []*TblUserFood) error
	UpdateUserFood(ctx context.Context, food *TblUserFood) error
	LoadUserFoods(ctx context.Context, userId int, out *[]TblUserFood) error

	AddUserEvent(ctx context.Context, event *TblUserEvent) (int, error)
	LoadUserEvent(ctx context.Context, userId int, eventId int, events *TblUserEvent) error
	LoadUserEvents(ctx context.Context, userId int, events *[]TblUserEvent) error

	// AddUserEventLog(ctx context.Context, event *TblUserEventLog) (int, error)
	// LoadUserEventLog(ctx context.Context, userId int, events *TblUserEventLog) error
	// LoadUserEventLogs(ctx context.Context, userId int, events *[]TblUserEventLog) error

	LoadUserEventsWithFood(ctx context.Context, userId int, out *[]UserEventWithFoods) error

	// sets the UserTime, FoodID, and EventID, on the given food
	AddUserFoodLog(ctx context.Context, food *TblUserFoodLog) (int, error)
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
