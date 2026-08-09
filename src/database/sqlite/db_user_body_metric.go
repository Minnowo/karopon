package sqlite

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
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

// DeleteUserBodyMetric deletes a body metric definition and any logged values for it
// (PON_USER_BODYLOG_METRIC has no ON DELETE CASCADE on BODY_METRIC_ID, so those rows
// are deleted explicitly here rather than via the database schema).
func (db *SqliteDatabase) DeleteUserBodyMetric(ctx context.Context, userID int, bodyMetricID int) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// Make sure the UserID owns this bodyMetricID, since the caller can't verify this.
		query := `SELECT COUNT(ID) FROM PON_USER_BODY_METRIC WHERE USER_ID = $1 AND ID = $2 LIMIT 1`

		if ok, err := db.CountOneTx(tx, query, userID, bodyMetricID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		if _, err := tx.Exec(
			`DELETE FROM PON_USER_BODYLOG_METRIC WHERE BODY_METRIC_ID = $1`,
			bodyMetricID,
		); err != nil {
			return err
		}

		_, err := tx.Exec(`DELETE FROM PON_USER_BODY_METRIC WHERE USER_ID = $1 AND ID = $2`, userID, bodyMetricID)

		return err
	})
}
