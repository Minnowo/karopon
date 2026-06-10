package postgres

import (
	"context"
	"time"

	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func aggregateToPG(fun database.AggregationFunc) string {
	switch fun {
	default:
		panic("impossible aggregation function")
	case database.AggregationSum:
		return "SUM"
	case database.AggregationAvg:
		return "AVERAGE" // or "AVG" if Postgres expects it
	case database.AggregationMin:
		return "MIN"
	case database.AggregationMax:
		return "MAX"
	}
}

// groupbyToPG returns the first parameter that should be passed into the postgres date_trunc(field, source [, time_zone
// ]) function.
// See https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC
func groupbyToPG(bucket database.GroupBy) string {

	switch bucket {
	default:
		panic("impossible group by")
	case database.GroupByOne:
		return "millennium"
	case database.GroupBySecond:
		return "second"
	case database.GroupByMinute:
		return "minute"
	case database.GroupByHour:
		return "hour"
	case database.GroupByDay:
		return "day"
	case database.GroupByWeek:
		return "week"
	case database.GroupByMonth:
		return "month"
	case database.GroupByYear:
		return "year"
	}
}

func (db *PGDatabase) LoadUserTimeData(
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
			t.NAMESPACE || ':' || t.NAME                                           AS TAG,
			date_trunc(?, ts.START_TIME)                                           AS BUCKET,
			EXTRACT(EPOCH FROM (SUM(ts.STOP_TIME - ts.START_TIME) * 1000))::bigint AS DURATION_MILLI

		FROM PON.USER_TAG t

		JOIN PON.USER_TIMESPAN_TAG tt
		ON tt.TAG_ID = t.ID

		JOIN PON.USER_TIMESPAN ts
		ON ts.ID = tt.TIMESPAN_ID

		WHERE 
			ts.STOP_TIME > ts.START_TIME
			AND (t.NAMESPACE || ':' || t.NAME) IN (?)
			AND t.USER_ID = ?
			AND ts.USER_ID = ?
			AND ts.START_TIME >= ? 
			AND ts.START_TIME <= ?

		GROUP BY t.NAMESPACE, t.NAME, BUCKET
		ORDER BY BUCKET ASC
	`

	query, args, err := sqlx.In(sql, groupbyToPG(groupby), tags, userID, userID, startTime.UTC(), endTime.UTC())

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	return db.SelectContext(ctx, out, query, args...)
}

func (db *PGDatabase) LoadUserChartData(
	ctx context.Context,
	cols []string,
	aggregation database.AggregationFunc,
	groupby database.GroupBy,
	startTime, stopTime time.Time,
) error {

	// aggFunc := aggregateToPG(aggregation)

	// sql := `
	// SELECT
	//

	// `

	return nil

}
