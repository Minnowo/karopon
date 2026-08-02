package sqlite

import (
	"context"
	"karopon/src/database"
)

func (db *SqliteDatabase) LoadUserBodyMetrics(
	ctx context.Context,
	userID int,
	out *[]database.TblUserBodyMetric,
) error {

	query := `
		SELECT * FROM PON_USER_BODY_METRIC m
		WHERE m.USER_ID = $1
		ORDER BY m.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) AddUserBodyMetric(ctx context.Context, metric *database.TblUserBodyMetric) (int, error) {

	query := `
		INSERT INTO PON_USER_BODY_METRIC (USER_ID, NAME, UNIT)
		VALUES (:USER_ID, :NAME, :UNIT)
	`

	return db.NamedInsertGetLastRowID(ctx, query, metric)
}

func (db *SqliteDatabase) DeleteUserBodyMetric(ctx context.Context, userID int, bodyMetricID int) error {

	query := `DELETE FROM PON_USER_BODY_METRIC WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, bodyMetricID)

	return err
}
