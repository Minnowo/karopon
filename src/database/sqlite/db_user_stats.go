package sqlite

import (
	"context"
	"karopon/src/database"
	"time"

	"github.com/vinovest/sqlx"
)

// groupbyToSqliteBucket returns the SQLite expression (applied to the given column) that truncates a
// datetime string to the start of its bucket, mirroring postgres' date_trunc(bucket, source) behaviour.
func groupbyToSqliteBucket(groupby database.GroupBy, column string) string {

	switch groupby {
	case database.GroupByOne:
		return "'0000-01-01 00:00:00'"
	case database.GroupBySecond:
		return "strftime('%Y-%m-%d %H:%M:%S', " + column + ")"
	case database.GroupByMinute:
		return "strftime('%Y-%m-%d %H:%M:00', " + column + ")"
	case database.GroupByHour:
		return "strftime('%Y-%m-%d %H:00:00', " + column + ")"
	case database.GroupByDay:
		return "strftime('%Y-%m-%d 00:00:00', " + column + ")"
	case database.GroupByWeek:
		// Truncate to the Monday of the ISO week containing the column's date.
		return "date(" + column + ", '-' || ((CAST(strftime('%w', " + column + ") AS INTEGER) + 6) % 7) || ' days') || ' 00:00:00'"
	case database.GroupByMonth:
		return "strftime('%Y-%m-01 00:00:00', " + column + ")"
	case database.GroupByYear:
		return "strftime('%Y-01-01 00:00:00', " + column + ")"
	default:
		panic("impossible group by")
	}
}

func (db *SqliteDatabase) LoadUserTimeData(
	ctx context.Context,
	userID int,
	startTime time.Time,
	endTime time.Time,
	tags []string,
	groupby database.GroupBy,
	out *[]database.TimespanTagDurationPoint,
) error {

	if len(tags) == 0 {
		return nil
	}

	bucket := groupbyToSqliteBucket(groupby, "ts.START_TIME")

	sql := `
		SELECT
			t.NAMESPACE || ':' || t.NAME                                                AS TAG,
			` + bucket + `                                                              AS BUCKET,
			CAST(ROUND(SUM((julianday(ts.STOP_TIME) - julianday(ts.START_TIME)) * 86400000)) AS INTEGER) AS DURATION_MILLI

		FROM PON_USER_TAG t

		JOIN PON_USER_TIMESPAN_TAG tt
		ON tt.TAG_ID = t.ID

		JOIN PON_USER_TIMESPAN ts
		ON ts.ID = tt.TIMESPAN_ID

		WHERE
			ts.STOP_TIME > ts.START_TIME
			AND (t.NAMESPACE || ':' || t.NAME) IN (?)
			AND t.USER_ID = ?
			AND ts.USER_ID = ?
			AND ts.START_TIME >= ?
			AND ts.START_TIME <= ?

		GROUP BY TAG, BUCKET
		ORDER BY BUCKET ASC
	`

	query, args, err := sqlx.In(sql, tags, userID, userID, startTime.UTC(), endTime.UTC())

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	var rows []struct {
		Tag           string `db:"tag"`
		Bucket        string `db:"bucket"`
		DurationMilli int64  `db:"duration_milli"`
	}

	if err := db.SelectContext(ctx, &rows, query, args...); err != nil {
		return err
	}

	points := make([]database.TimespanTagDurationPoint, len(rows))

	for i, r := range rows {

		bucket, err := time.ParseInLocation("2006-01-02 15:04:05", r.Bucket, time.UTC)

		if err != nil {
			return err
		}

		points[i] = database.TimespanTagDurationPoint{
			Tag:           r.Tag,
			Bucket:        database.TimeMillis(bucket),
			DurationMilli: r.DurationMilli,
		}
	}

	*out = points

	return nil
}
