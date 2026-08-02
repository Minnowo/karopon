package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) LoadUserBodyMetrics(ctx context.Context, userID int, out *[]database.TblUserBodyMetric) error {

	query := `
		SELECT * FROM PON.USER_BODY_METRIC m
		WHERE m.USER_ID = $1
		ORDER BY m.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) AddUserBodyMetric(ctx context.Context, metric *database.TblUserBodyMetric) (int, error) {

	query := `
		INSERT INTO PON.USER_BODY_METRIC (USER_ID, NAME, UNIT)
		VALUES (:user_id, :name, :unit)
		RETURNING ID;
	`

	id, err := db.NamedInsertReturningID(ctx, query, metric)

	return id, err
}

func (db *PGDatabase) DeleteUserBodyMetric(ctx context.Context, userID int, bodyMetricID int) error {

	query := `DELETE FROM PON.USER_BODY_METRIC WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, bodyMetricID)

	return err
}
