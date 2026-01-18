package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddUserTimespan(ctx context.Context, ts *database.TblUserTimespan) (int, error) {
	query := `
		INSERT INTO PON.USER_TIMESPAN (
			user_id, start_time, stop_time, note
		) VALUES (
			:user_id, :start_time, :stop_time, :note
		) RETURNING id
	`

	return db.InsertOneNamedGetID(ctx, query, ts)
}

func (db *PGDatabase) UpdateUserTimespan(ctx context.Context, ts *database.TblUserTimespan) error {
	query := `
		UPDATE PON.USER_TIMESPAN
		SET
			START_TIME = :start_time,
			STOP_TIME = :stop_time,
			NOTE = :note
		WHERE ID = :id AND USER_ID = :user_id
	`

	_, err := db.NamedExecContext(ctx, query, ts)

	return err
}

func (db *PGDatabase) LoadUserTimespans(ctx context.Context, userId int, out *[]database.TblUserTimespan) error {
	query := `
		SELECT * FROM PON.USER_TIMESPAN
		WHERE USER_ID = $1
		ORDER BY START_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userId)
}
