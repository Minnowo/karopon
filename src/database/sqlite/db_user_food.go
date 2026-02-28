package sqlite

import (
	"context"
	"io"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserFood(ctx context.Context, food *database.TblUserFood) (int, error) {

	query := `
        INSERT INTO PON_USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
		VALUES (:USER_ID, :NAME, :UNIT, :PORTION, :PROTEIN, :CARB, :FIBRE, :FAT)
    `

	id, err := db.NamedInsertGetLastRowID(ctx, query, food)

	return id, err
}

func (db *SqliteDatabase) AddUserFoods(ctx context.Context, foods []database.TblUserFood) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON_USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
			VALUES (:USER_ID, :NAME, :UNIT, :PORTION, :PROTEIN, :CARB, :FIBRE, :FAT)
    	`
		for _, food := range foods {

			_, err := tx.NamedExec(query, food)

			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (db *SqliteDatabase) UpdateUserFood(ctx context.Context, food *database.TblUserFood) error {

	query := `
		UPDATE PON_USER_FOOD
		SET
			NAME    = :NAME,
			UNIT    = :UNIT,
			PORTION = :PORTION,
			PROTEIN = :PROTEIN,
			CARB    = :CARB,
			FIBRE   = :FIBRE,
			FAT     = :FAT
		WHERE USER_ID = :USER_ID AND ID = :ID 
    `

	_, err := db.NamedExecContext(ctx, query, food)

	return err
}

func (db *SqliteDatabase) DeleteUserFood(ctx context.Context, userID int, foodID int) error {

	query := `
	DELETE FROM PON_USER_FOOD
	WHERE USER_ID = $1 AND ID = $2
	`

	_, err := db.ExecContext(ctx, query, userID, foodID)

	return err
}

func (db *SqliteDatabase) LoadUserFoods(ctx context.Context, userID int, out *[]database.TblUserFood) error {
	query := `
		SELECT * FROM PON_USER_FOOD f
		WHERE f.USER_ID = $1
		ORDER BY f.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) ExportUserFoodsCSV(ctx context.Context, w io.Writer) error {
	query := `SELECT * FROM PON_USER_FOOD`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
