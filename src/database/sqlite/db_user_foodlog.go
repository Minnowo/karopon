package sqlite

import (
	"context"
	"database/sql"
	"io"
	"karopon/src/database"

	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserFoodLog(ctx context.Context, food *database.TblUserFoodLog) (int, error) {

	var retID int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		id, err := db.AddUserFoodLogTx(tx, food)
		if err != nil {
			return err
		}

		retID = id

		return nil
	})

	return retID, err
}

func (db *SqliteDatabase) AddUserFoodLogTx(tx *sqlx.Tx, food *database.TblUserFoodLog) (int, error) {

	var query string

	{ // USER_FOOD table stuff
		query = `SELECT ID FROM PON_USER_FOOD f ` +
			`WHERE f.USER_ID = $1 AND f.NAME = $2 AND f.UNIT = $3 ` +
			`LIMIT 1`

		err := tx.QueryRow(query, food.UserID, food.Name, food.Unit).Scan(&food.FoodID)

		switch {

		case errors.Is(err, sql.ErrNoRows):
			log.Debug().Msg("got error no rows")

			if food.Portion == 0 {
				return -1, database.ErrFoodPortionIsZero
			}

			newFood := database.TblUserFood{
				UserID:  food.UserID,
				Name:    food.Name,
				Unit:    food.Unit,
				Portion: food.Portion,
				Protein: food.Protein,
				Carb:    food.Carb,
				Fibre:   food.Fibre,
				Fat:     food.Fat,
			}
			newFood.Scale()

			query = `INSERT INTO PON_USER_FOOD ` +
				`(USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT) VALUES ` +
				`(:USER_ID, :NAME, :UNIT, :PORTION, :PROTEIN, :CARB, :FIBRE, :FAT) `

			if id, err := db.NamedInsertGetLastRowIDTx(tx, query, newFood); err != nil {
				return -1, err
			} else {
				food.FoodID = &id
				log.Debug().Int("id", *food.FoodID).Msg("created new food")
			}

		case err != nil:
			return -1, err

		default:
			id := -1
			if food.FoodID != nil {
				id = *food.FoodID
			}
			log.Debug().Int("id", id).Msg("found existing food")

		}
	}

	// Load or create the event based off the name, if we have a name, and no ID.
	if food.Event != "" && (food.EventID == nil || *food.EventID <= 0) {

		query = `SELECT ID FROM PON_USER_EVENT e WHERE e.USER_ID = $1 AND e.NAME = $2 LIMIT 1`

		err := tx.QueryRow(query, food.UserID, food.Event).Scan(&food.EventID)

		switch {

		case errors.Is(err, sql.ErrNoRows):

			log.Debug().Msg("got error no rows")

			event := database.TblUserEvent{
				UserID: food.UserID,
				Name:   food.Event,
			}

			query = `INSERT INTO PON_USER_EVENT (USER_ID, NAME) VALUES (:USER_ID, :NAME)`

			if id, err := db.NamedInsertGetLastRowIDTx(tx, query, event); err != nil {
				return -1, err
			} else {
				food.EventID = &id
				log.Debug().Int("id", *food.EventID).Msg("created new event")
			}

		case err != nil:
			return -1, err

		default:
			log.Debug().Int("id", *food.EventID).Msg("found existing event")
		}
	}

	query = `INSERT INTO PON_USER_FOODLOG ` +
		`(` +
		`USER_ID, FOOD_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, ` +
		`CARB, FIBRE, FAT, EVENT_ID, EVENTLOG_ID` +
		`) VALUES (` +
		`:USER_ID, :FOOD_ID, :USER_TIME, :NAME, :EVENT, :UNIT, :PORTION, ` +
		`:PROTEIN, :CARB, :FIBRE, :FAT, :EVENT_ID, :EVENTLOG_ID` +
		`) `

	id, err := db.NamedInsertGetLastRowIDTx(tx, query, food)

	if err != nil {
		return -1, err
	}

	return id, nil
}

func (db *SqliteDatabase) LoadUserFoodLogs(ctx context.Context, userID int, out *[]database.TblUserFoodLog) error {

	query := `SELECT * FROM PON_USER_FOODLOG fl ` +
		`WHERE fl.USER_ID = $1 ` +
		`ORDER BY fl.USER_TIME DESC`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) LoadUserFoodLogByEvent(
	ctx context.Context,
	userID int,
	eventID int,
	out *[]database.TblUserFoodLog,
) error {

	query := `SELECT * FROM PON_USER_FOODLOG fl ` +
		`WHERE fl.USER_ID = $1 AND fl.EVENT_ID = $2 ` +
		`ORDER BY fl.USER_TIME DESC`

	return db.SelectContext(ctx, out, query, userID, eventID)
}

func (db *SqliteDatabase) LoadUserFoodLogByEventLogTx(
	tx *sqlx.Tx,
	userID int,
	eventLogID int,
	out *[]database.TblUserFoodLog,
) error {

	query := `SELECT * FROM PON_USER_FOODLOG fl ` +
		`WHERE fl.USER_ID = $1 AND fl.EVENTLOG_ID = $2 ` +
		`ORDER BY fl.USER_TIME DESC`

	return tx.Select(out, query, userID, eventLogID)
}

func (db *SqliteDatabase) ExportUserFoodLogsCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_USER_FOODLOG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
