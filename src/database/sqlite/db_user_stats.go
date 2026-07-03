package sqlite

import (
	"context"
	"karopon/src/database"
	"sort"
	"time"

	"github.com/vinovest/sqlx"
)

// truncateToBucket truncates t (in UTC) to the start of the bucket it falls into, mirroring
// postgres' date_trunc(bucket, source) behaviour.
func truncateToBucket(t time.Time, groupby database.GroupBy) time.Time {

	t = t.UTC()

	switch groupby {
	case database.GroupByOne:
		return time.Time{}
	case database.GroupBySecond:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, time.UTC)
	case database.GroupByMinute:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), 0, 0, time.UTC)
	case database.GroupByHour:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, time.UTC)
	case database.GroupByDay:
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	case database.GroupByWeek:
		d := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		offset := (int(d.Weekday()) + 6) % 7 // ISO week starts on Monday
		return d.AddDate(0, 0, -offset)
	case database.GroupByMonth:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	case database.GroupByYear:
		return time.Date(t.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
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

	sql := `
		SELECT
			t.NAMESPACE || ':' || t.NAME AS TAG,
			ts.START_TIME                AS START_TIME,
			ts.STOP_TIME                 AS STOP_TIME

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
	`

	query, args, err := sqlx.In(sql, tags, userID, userID, startTime.UTC(), endTime.UTC())

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	var rows []struct {
		Tag       string              `db:"tag"`
		StartTime database.TimeMillis `db:"start_time"`
		StopTime  database.TimeMillis `db:"stop_time"`
	}

	if err := db.SelectContext(ctx, &rows, query, args...); err != nil {
		return err
	}

	type bucketKey struct {
		tag    string
		bucket time.Time
	}

	sums := make(map[bucketKey]int64)

	for _, r := range rows {

		k := bucketKey{tag: r.Tag, bucket: truncateToBucket(r.StartTime.Time(), groupby)}

		sums[k] += r.StopTime.Time().Sub(r.StartTime.Time()).Milliseconds()
	}

	points := make([]database.TimespanTagDurationPoint, 0, len(sums))

	for k, durationMilli := range sums {
		points = append(points, database.TimespanTagDurationPoint{
			Tag:           k.tag,
			Bucket:        database.TimeMillis(k.bucket),
			DurationMilli: durationMilli,
		})
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Bucket.Time().Before(points[j].Bucket.Time())
	})

	*out = points

	return nil
}
