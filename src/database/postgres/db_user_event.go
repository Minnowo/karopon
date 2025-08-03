package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddUserEvent(ctx context.Context, event *database.TblUserEvent) (int, error) {
	query := `
		INSERT INTO PON.USER_EVENT (USER_ID, NAME)
		VALUES (:user_id, :name)
		RETURNING ID;
	`

	id, err := db.InsertOneNamedGetID(ctx, query, event)

	return id, err
}

func (db *PGDatabase) LoadUserEvent(ctx context.Context, userId int, eventId int, out *database.TblUserEvent) error {
	query := `
		SELECT * FROM PON.USER_EVENT u
		WHERE u.ID = $1 AND u.USER_ID = $2
	`

	return db.GetContext(ctx, out, query, eventId, userId)
}

func (db *PGDatabase) LoadUserEventByName(ctx context.Context, userId int, name string, out *database.TblUserEvent) error {
	query := `
		SELECT * FROM PON.USER_EVENT u
		WHERE u.NAME = $1 AND u.USER_ID = $2
	`

	return db.GetContext(ctx, out, query, name, userId)
}

func (db *PGDatabase) LoadUserEvents(ctx context.Context, userId int, out *[]database.TblUserEvent) error {
	query := `
		SELECT * FROM PON.USER_EVENT u
		WHERE u.USER_ID = $1
	`

	return db.SelectContext(ctx, out, query, userId)
}
