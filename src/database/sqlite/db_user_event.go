package sqlite

import (
	"context"
	"database/sql"
	"io"
	"karopon/src/database"

	"github.com/pkg/errors"
	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserEvent(ctx context.Context, event *database.TblUserEvent) (int, error) {
	query := `INSERT INTO PON_USER_EVENT (USER_ID, NAME) VALUES (:USER_ID, :NAME);`

	id, err := db.NamedInsertGetLastRowID(ctx, query, event)

	return id, err
}

func (db *SqliteDatabase) LoadUserEvent(
	ctx context.Context,
	userID int,
	eventID int,
	out *database.TblUserEvent,
) error {
	query := `SELECT * FROM PON_USER_EVENT u WHERE u.ID = $1 AND u.USER_ID = $2`

	return db.GetContext(ctx, out, query, eventID, userID)
}

func (db *SqliteDatabase) LoadUserEventByName(
	ctx context.Context,
	userID int,
	name string,
	out *database.TblUserEvent,
) error {
	query := `SELECT * FROM PON_USER_EVENT u WHERE u.NAME = $1 AND u.USER_ID = $2`

	return db.GetContext(ctx, out, query, name, userID)
}

func (db *SqliteDatabase) LoadUserEvents(ctx context.Context, userID int, out *[]database.TblUserEvent) error {
	query := `SELECT * FROM PON_USER_EVENT u WHERE u.USER_ID = $1`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) LoadAndOrCreateUserEventByNameTx(
	tx *sqlx.Tx,
	userID int,
	name string,
	out *database.TblUserEvent,
) error {

	query := `SELECT * FROM PON_USER_EVENT u WHERE u.NAME = $1 AND u.USER_ID = $2 LIMIT 1`

	if err := tx.Get(out, query, name, userID); err == nil {
		return nil // loaded into out
	} else if !errors.Is(err, sql.ErrNoRows) {
		return err // unknown error
	}

	id, err := db.NamedInsertGetLastRowIDTx(tx,
		`INSERT INTO PON_USER_EVENT (USER_ID, NAME) VALUES (:USER_ID, :NAME)`,
		database.TblUserEvent{
			UserID: userID,
			Name:   name,
		})

	if err != nil {
		return err
	}

	out.UserID = userID
	out.Name = name
	out.ID = id

	return nil
}

func (db *SqliteDatabase) ExportUserEventsCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_USER_EVENT`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
