package postgres

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"karopon/src/database"

	"github.com/rs/zerolog/log"
	"github.com/vinovest/sqlx"
)

func (db *PGDatabase) AddUserFoodLogTx(tx *sqlx.Tx, food *database.TblUserFoodLog) (int, error) {

	var query string

	{ // USER_FOOD table stuff
		query = `SELECT ID FROM PON.USER_FOOD f ` +
			`WHERE f.USER_ID = $1 AND f.NAME = $2 AND f.UNIT = $3 ` +
			`LIMIT 1`

		err := tx.QueryRow(query, food.UserID, food.Name, food.Unit).Scan(&food.FoodID)

		switch {

		case errors.Is(err, sql.ErrNoRows):
			// Foods are made on the foods page; an event only uses saved ones.
			return -1, database.ErrFoodNotFound

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

	query = `INSERT INTO PON.USER_FOODLOG ` +
		`(` +
		`USER_ID, FOOD_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, ` +
		`CARB, FIBRE, FAT, EVENTLOG_ID` +
		`) VALUES (` +
		`:user_id, :food_id, :user_time, :name, :event, :unit, :portion, :protein, ` +
		`:carb, :fibre, :fat, :eventlog_id` +
		`) RETURNING ID;`

	id, err := db.NamedInsertReturningIDTx(tx, query, food)

	if err != nil {
		return -1, err
	}

	return id, nil
}

func (db *PGDatabase) LoadUserFoodLogByEventLogTx(
	tx *sqlx.Tx,
	userID int,
	eventLogID int,
	out *[]database.TblUserFoodLog,
) error {

	query := `SELECT * FROM PON.USER_FOODLOG fl ` +
		`WHERE fl.USER_ID = $1 AND fl.EVENTLOG_ID = $2 ` +
		`ORDER BY fl.USER_TIME DESC`

	return tx.Select(out, query, userID, eventLogID)
}

func (db *PGDatabase) ExportUserFoodLogsCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON.USER_FOODLOG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
