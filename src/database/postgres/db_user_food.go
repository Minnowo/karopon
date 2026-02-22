package postgres

import (
	"context"
	"io"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *PGDatabase) AddUserFood(ctx context.Context, food *database.TblUserFood) (int, error) {

	query := `
        INSERT INTO PON.USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
		VALUES (:user_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat)
        RETURNING ID;
    `

	id, err := db.NamedInsertReturningID(ctx, query, food)

	return id, err
}

func (db *PGDatabase) AddUserFoods(ctx context.Context, foods []database.TblUserFood) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON.USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
			VALUES (:user_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat)
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

func (db *PGDatabase) UpdateUserFood(ctx context.Context, food *database.TblUserFood) error {

	query := `
		UPDATE PON.USER_FOOD
		SET
			NAME    = :name,
			UNIT    = :unit,
			PORTION = :portion,
			PROTEIN = :protein,
			CARB    = :carb,
			FIBRE   = :fibre,
			FAT     = :fat
		WHERE USER_ID = :user_id AND ID = :id 
    `

	_, err := db.NamedExecContext(ctx, query, food)

	return err
}

func (db *PGDatabase) DeleteUserFood(ctx context.Context, userId int, foodId int) error {

	query := `
	DELETE FROM PON.USER_FOOD f
	WHERE f.USER_ID = $1 AND f.ID = $2
	`

	_, err := db.DB.ExecContext(ctx, query, userId, foodId)

	return err
}

func (db *PGDatabase) LoadUserFoods(ctx context.Context, userId int, out *[]database.TblUserFood) error {
	query := `
		SELECT * FROM PON.USER_FOOD f
		WHERE f.USER_ID = $1
		ORDER BY f.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) ExportUserFoodsCSV(ctx context.Context, w io.Writer) error {
	query := `SELECT * FROM PON.USER_FOOD`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
