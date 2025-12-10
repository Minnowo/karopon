package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) UsernameTaken(ctx context.Context, userId int, username string) (bool, error) {

	var result struct {
		Count int `db:"count"`
	}

	query := `SELECT COUNT(*) AS count FROM PON.USER u WHERE u.ID != $1 AND u.NAME = $2`

	err := db.GetContext(ctx, &result, query, userId, username)

	return result.Count != 0, err
}

func (db *PGDatabase) AddUser(ctx context.Context, user *database.TblUser) (int, error) {

	var retUserId int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {
		query := `
    	    INSERT INTO PON.USER (
				NAME, PASSWORD,
				DARK_MODE, SHOW_DIABETES, CALORIC_CALC_METHOD,
				INSULIN_SENSITIVITY_FACTOR, EVENT_HISTORY_FETCH_LIMIT, TARGET_BLOOD_SUGAR
			) VALUES (
				:name, :password,
				:dark_mode, :show_diabetes, :caloric_calc_method,
				:insulin_sensitivity_factor, :event_history_fetch_limit, :target_blood_sugar
			)
    	    RETURNING ID;
    	`

		id, err := db.InsertOneNamedGetIDTx(tx, query, user)

		if err != nil {
			return err
		}

		retUserId = id

		return nil
	})

	return retUserId, err
}

func (db *PGDatabase) UpdateUser(ctx context.Context, user *database.TblUser) error {
	query := `UPDATE PON.USER SET
	NAME=:name,
	PASSWORD=:password,
	CREATED=:created,
	DARK_MODE=:dark_mode,
	SHOW_DIABETES=:show_diabetes,
	CALORIC_CALC_METHOD=:caloric_calc_method,
	INSULIN_SENSITIVITY_FACTOR=:insulin_sensitivity_factor,
	TARGET_BLOOD_SUGAR=:target_blood_sugar,
	EVENT_HISTORY_FETCH_LIMIT=:event_history_fetch_limit
	WHERE ID=:id
	`

	_, err := db.NamedExecContext(ctx, query, user)

	return err
}

func (db *PGDatabase) LoadUser(ctx context.Context, username string, user *database.TblUser) error {

	query := `SELECT * FROM PON.USER WHERE NAME = $1 LIMIT 1`

	err := db.GetContext(ctx, user, query, username)

	if err != nil {
		return err
	}

	return nil
}

func (db *PGDatabase) LoadUsers(ctx context.Context, users *[]database.TblUser) error {

	query := `SELECT * FROM PON.USER`

	return db.SelectContext(ctx, users, query)
}
