package sqlite

import (
	"context"
	"karopon/src/database"
	"sort"
	"time"

	"github.com/vinovest/sqlx"
)

// truncateToBucket truncates t to the start of the bucket it falls into, mirroring postgres'
// date_trunc(bucket, source, zone) behaviour: truncation happens on the wall-clock time in loc,
// not in UTC, so day/week/month/year buckets align with the user's local calendar. dayOffset
// (the user's DayTimeOffsetSeconds) is subtracted before truncating and added back after, so
// bucket boundaries land on the user's perceived day start rather than local midnight.
func truncateToBucket(t time.Time, groupby database.GroupBy, loc *time.Location, dayOffset time.Duration) time.Time {

	t = t.In(loc).Add(-dayOffset)

	switch groupby {
	case database.GroupByOne:
		return time.Time{}
	case database.GroupBySecond:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, loc).Add(dayOffset)
	case database.GroupByMinute:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), 0, 0, loc).Add(dayOffset)
	case database.GroupByHour:
		return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, loc).Add(dayOffset)
	case database.GroupByDay:
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc).Add(dayOffset)
	case database.GroupByWeek:
		d := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc)
		offset := (int(d.Weekday()) + 6) % 7 // ISO week starts on Monday
		return d.AddDate(0, 0, -offset).Add(dayOffset)
	case database.GroupByMonth:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, loc).Add(dayOffset)
	case database.GroupByYear:
		return time.Date(t.Year(), 1, 1, 0, 0, 0, 0, loc).Add(dayOffset)
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
	timezone database.Timezone,
	dayOffset time.Duration,
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

		k := bucketKey{tag: r.Tag, bucket: truncateToBucket(r.StartTime.Time(), groupby, timezone.Loc(), dayOffset)}

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
