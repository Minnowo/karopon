package sqlite

import (
	"context"
	"io"
	"karopon/src/database"
)

func (db *SqliteDatabase) UsernameTaken(ctx context.Context, userId int, username string) (bool, error) {

	var result struct {
		Count int `db:"count"`
	}

	query := `SELECT COUNT(*) AS COUNT FROM PON_USER u WHERE u.ID != $1 AND u.NAME = $2`

	err := db.GetContext(ctx, &result, query, userId, username)

	return result.Count != 0, err
}

func (db *SqliteDatabase) AddUser(ctx context.Context, user *database.TblUser) (int, error) {

	query := `
		INSERT INTO PON_USER (
			NAME, PASSWORD,
			THEME, SHOW_DIABETES, CALORIC_CALC_METHOD,
			INSULIN_SENSITIVITY_FACTOR, EVENT_HISTORY_FETCH_LIMIT, TARGET_BLOOD_SUGAR,
			SESSION_EXPIRE_TIME_SECONDS,
			TIME_FORMAT,
			DATE_FORMAT
		) VALUES (
			:NAME, :PASSWORD,
			:THEME, :SHOW_DIABETES, :CALORIC_CALC_METHOD,
			:INSULIN_SENSITIVITY_FACTOR, :EVENT_HISTORY_FETCH_LIMIT, :TARGET_BLOOD_SUGAR,
			:SESSION_EXPIRE_TIME_SECONDS,
			:TIME_FORMAT,
			:DATE_FORMAT
		)
	`

	return db.NamedInsertGetLastRowID(ctx, query, user)
}

func (db *SqliteDatabase) UpdateUser(ctx context.Context, user *database.TblUser) error {
	query := `UPDATE PON_USER SET
	NAME=:NAME,
	PASSWORD=:PASSWORD,
	CREATED=:CREATED,
	THEME=:THEME,
	SHOW_DIABETES=:SHOW_DIABETES,
	CALORIC_CALC_METHOD=:CALORIC_CALC_METHOD,
	INSULIN_SENSITIVITY_FACTOR=:INSULIN_SENSITIVITY_FACTOR,
	TARGET_BLOOD_SUGAR=:TARGET_BLOOD_SUGAR,
	EVENT_HISTORY_FETCH_LIMIT=:EVENT_HISTORY_FETCH_LIMIT,
	SESSION_EXPIRE_TIME_SECONDS=:SESSION_EXPIRE_TIME_SECONDS,
	TIME_FORMAT=:TIME_FORMAT,
	DATE_FORMAT=:DATE_FORMAT
	WHERE ID=:ID
	`

	_, err := db.NamedExecContext(ctx, query, user)

	return err
}

func (db *SqliteDatabase) LoadUserById(ctx context.Context, id int, user *database.TblUser) error {

	query := `SELECT * FROM PON_USER WHERE ID = $1 LIMIT 1`

	err := db.GetContext(ctx, user, query, id)

	if err != nil {
		return err
	}

	return nil
}

func (db *SqliteDatabase) LoadUser(ctx context.Context, username string, user *database.TblUser) error {

	query := `SELECT * FROM PON_USER WHERE NAME = $1 LIMIT 1`

	err := db.GetContext(ctx, user, query, username)

	if err != nil {
		return err
	}

	return nil
}

func (db *SqliteDatabase) ExportUserCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_USER`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
