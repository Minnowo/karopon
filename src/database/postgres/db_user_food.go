package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) AddUserFood(ctx context.Context, food *database.TblUserFood) (int, error) {

	query := `
        INSERT INTO PON.USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
		VALUES (:user_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat)
        RETURNING ID;
    `

	id, err := db.InsertOneNamedGetID(ctx, query, food)

	return id, err
}

func (db *PGDatabase) AddUserFoods(ctx context.Context, foods []*database.TblUserFood) error {

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

func (db *PGDatabase) LoadUserFoods(ctx context.Context, userId int, out *[]database.TblUserFood) error {
	query := `
		SELECT * FROM PON.USER_FOOD f
		WHERE f.USER_ID = $1
	`

	return db.SelectContext(ctx, out, query, userId)
}
