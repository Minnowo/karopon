package sqlite

import (
	"context"
	"io"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) LoadUserBodyLogs(ctx context.Context, userID int, out *[]database.UserBodyLog) error {

	return db.WithTxRead(ctx, func(tx *sqlx.Tx) error {

		var bodylogs []database.TblUserBodyLog

		query := `
			SELECT * FROM PON_USER_BODYLOG f
			WHERE f.USER_ID = $1
			ORDER BY f.USER_TIME DESC
		`

		err := tx.Select(&bodylogs, query, userID)

		if err != nil {
			return err
		}

		result := make([]database.UserBodyLog, len(bodylogs))

		metricQuery := `SELECT * FROM PON_USER_BODYLOG_METRIC WHERE BODYLOG_ID = $1`

		for i, bodylog := range bodylogs {

			var metrics []database.TblUserBodyLogMetric

			err := tx.Select(&metrics, metricQuery, bodylog.ID)

			if err != nil {
				return err
			}

			if metrics == nil {
				metrics = make([]database.TblUserBodyLogMetric, 0)
			}

			result[i] = database.UserBodyLog{
				BodyLog: bodylog,
				Metrics: metrics,
			}
		}

		*out = result

		return nil
	})
}

// validateUserBodyMetricOwnershipTx ensures every metric referenced belongs to userID.
func (db *SqliteDatabase) validateUserBodyMetricOwnershipTx(
	tx *sqlx.Tx,
	userID int,
	metrics []database.TblUserBodyLogMetric,
) error {

	if len(metrics) == 0 {
		return nil
	}

	ids := make(map[int]struct{}, len(metrics))
	for _, m := range metrics {
		ids[m.BodyMetricID] = struct{}{}
	}

	uniqueIDs := make([]int, 0, len(ids))
	for id := range ids {
		uniqueIDs = append(uniqueIDs, id)
	}

	query, args, err := sqlx.In(`SELECT COUNT(*) FROM PON_USER_BODY_METRIC WHERE USER_ID = ? AND ID IN (?)`,
		userID, uniqueIDs)

	if err != nil {
		return err
	}

	query = tx.Rebind(query)

	var count int

	err = tx.Get(&count, query, args...)

	if err != nil {
		return err
	}

	if count != len(uniqueIDs) {
		return database.ErrInvalidBodyMetric
	}

	return nil
}

func (db *SqliteDatabase) AddUserBodyLogs(ctx context.Context, entry *database.UserBodyLog) (int, error) {

	var retID int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		err := db.validateUserBodyMetricOwnershipTx(tx, entry.BodyLog.UserID, entry.Metrics)

		if err != nil {
			return err
		}

		query := `
			INSERT INTO PON_USER_BODYLOG (USER_ID, USER_TIME)
			VALUES (:USER_ID, :USER_TIME)
		`

		id, err := db.NamedInsertGetLastRowIDTx(tx, query, entry.BodyLog)

		if err != nil {
			return err
		}

		metricQuery := `
			INSERT INTO PON_USER_BODYLOG_METRIC (BODYLOG_ID, BODY_METRIC_ID, VALUE)
			VALUES (:BODYLOG_ID, :BODY_METRIC_ID, :VALUE)
		`

		for _, metric := range entry.Metrics {

			metric.BodyLogID = id

			_, err := tx.NamedExec(metricQuery, metric)

			if err != nil {
				return err
			}
		}

		retID = id

		return nil
	})

	return retID, err
}

func (db *SqliteDatabase) UpdateUserBodyLog(ctx context.Context, entry *database.UserBodyLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		err := db.validateUserBodyMetricOwnershipTx(tx, entry.BodyLog.UserID, entry.Metrics)

		if err != nil {
			return err
		}

		query := `
			UPDATE PON_USER_BODYLOG
			SET USER_TIME = :USER_TIME
			WHERE ID = :ID AND USER_ID = :USER_ID
		`

		res, err := tx.NamedExec(query, entry.BodyLog)

		if err != nil {
			return err
		}

		affected, err := res.RowsAffected()

		if err != nil {
			return err
		}

		// Either the bodylog doesn't exist, or it doesn't belong to this user - leave
		// its metric values untouched rather than deleting another user's data.
		if affected == 0 {
			return nil
		}

		deleteQuery := `DELETE FROM PON_USER_BODYLOG_METRIC WHERE BODYLOG_ID = $1`

		_, err = tx.Exec(deleteQuery, entry.BodyLog.ID)

		if err != nil {
			return err
		}

		metricQuery := `
			INSERT INTO PON_USER_BODYLOG_METRIC (BODYLOG_ID, BODY_METRIC_ID, VALUE)
			VALUES (:BODYLOG_ID, :BODY_METRIC_ID, :VALUE)
		`

		for _, metric := range entry.Metrics {

			metric.BodyLogID = entry.BodyLog.ID

			_, err := tx.NamedExec(metricQuery, metric)

			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (db *SqliteDatabase) DeleteUserBodyLog(ctx context.Context, userID int, bodyLogID int) error {

	query := `DELETE FROM PON_USER_BODYLOG WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, bodyLogID)

	return err
}

func (db *SqliteDatabase) ExportBodyLogCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_USER_BODYLOG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
