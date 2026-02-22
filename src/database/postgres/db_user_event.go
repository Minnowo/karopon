package postgres

import (
	"context"
	"database/sql"
	"io"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) AddUserEvent(ctx context.Context, event *database.TblUserEvent) (int, error) {
	query := `INSERT INTO PON.USER_EVENT (USER_ID, NAME) VALUES (:user_id, :name) RETURNING ID;`

	id, err := db.NamedInsertReturningID(ctx, query, event)

	return id, err
}

func (db *PGDatabase) LoadUserEvent(ctx context.Context, userId int, eventId int, out *database.TblUserEvent) error {
	query := `SELECT * FROM PON.USER_EVENT u WHERE u.ID = $1 AND u.USER_ID = $2`

	return db.GetContext(ctx, out, query, eventId, userId)
}

func (db *PGDatabase) LoadUserEventByName(ctx context.Context, userId int, name string, out *database.TblUserEvent) error {
	query := `SELECT * FROM PON.USER_EVENT u WHERE u.NAME = $1 AND u.USER_ID = $2`

	return db.GetContext(ctx, out, query, name, userId)
}

func (db *PGDatabase) LoadUserEvents(ctx context.Context, userId int, out *[]database.TblUserEvent) error {
	query := `SELECT * FROM PON.USER_EVENT u WHERE u.USER_ID = $1`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) LoadAndOrCreateUserEventByNameTx(tx *sqlx.Tx, userId int, name string, out *database.TblUserEvent) error {

	query := `SELECT * FROM PON.USER_EVENT u WHERE u.NAME = $1 AND u.USER_ID = $2 LIMIT 1`

	if err := tx.Get(out, query, name, userId); err == nil {
		return nil // loaded into out
	} else if err != sql.ErrNoRows {
		return err // unknown error
	}

	id, err := db.NamedInsertReturningIDTx(tx,
		`INSERT INTO PON.USER_EVENT (USER_ID, NAME) VALUES (:user_id, :name) RETURNING ID;`,
		database.TblUserEvent{
			UserID: userId,
			Name:   name,
		})

	if err != nil {
		return err
	}

	out.UserID = userId
	out.Name = name
	out.ID = id

	return nil
}

func (db *PGDatabase) ExportUserEventsCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON.USER_EVENT`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
