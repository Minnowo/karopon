package postgres

import (
	"context"
	"time"

	"karopon/src/database"

	"github.com/rs/zerolog/log"
	"github.com/vinovest/sqlx"
)

func aggregateToPG(fun database.AggregationFunc) string {
	switch fun {
	default:
		panic("impossible aggregation function")
	case database.AggregationSum:
		return "SUM"
	case database.AggregationAvg:
		return "AVG"
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
	aggregation database.AggregationFunc,
	groupby database.GroupBy,
	timezone database.Timezone,
	dayOffset time.Duration,
	out *[]database.TimespanTagDurationPoint,
) error {

	if len(tags) == 0 {
		return nil
	}

	if !aggregation.IsValid() {
		return database.ErrInvalidAggregation
	}

	tzName := timezone.Name
	if tzName == "" {
		tzName = "UTC"
	}

	aggFunc := aggregateToPG(aggregation)

	// START_TIME/STOP_TIME are stored as naive UTC timestamps. To bucket by the user's local
	// calendar day/week/month/year (rather than the UTC one), reinterpret them as timestamptz
	// via "AT TIME ZONE 'UTC'" and truncate using the 3-arg date_trunc(field, ts, zone) form.
	// dayOffsetSeconds is subtracted before truncation and added back after, so day-aligned
	// buckets start at the user's perceived day boundary instead of local midnight.
	sql := `
		SELECT
			t.NAMESPACE || ':' || t.NAME                                               AS TAG,
			date_trunc(
				?,
				(ts.START_TIME AT TIME ZONE 'UTC') - (? * INTERVAL '1 second'),
				?
			) + (? * INTERVAL '1 second')                                              AS BUCKET,
			EXTRACT(EPOCH FROM (` + aggFunc + `(ts.STOP_TIME - ts.START_TIME) * 1000))::bigint AS DURATION_MILLI

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

	dayOffsetSeconds := int(dayOffset.Seconds())

	log.Debug().
		Str("groupby", groupbyToPG(groupby)).
		Str("aggregation", aggFunc).
		Str("timezone", tzName).
		Int("dayOffsetSeconds", dayOffsetSeconds).
		Msg("running time stats agg")

	query, args, err := sqlx.In(sql,
		groupbyToPG(groupby), dayOffsetSeconds, tzName, dayOffsetSeconds,
		tags, userID, userID, startTime.UTC(), endTime.UTC(),
	)

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	return db.SelectContext(ctx, out, query, args...)
}

func (db *PGDatabase) LoadUserBodyLogTimeData(
	ctx context.Context,
	userID int,
	startTime time.Time,
	endTime time.Time,
	metricNames []string,
	aggregation database.AggregationFunc,
	groupby database.GroupBy,
	timezone database.Timezone,
	dayOffset time.Duration,
	out *[]database.BodyLogMetricPoint,
) error {

	if len(metricNames) == 0 {
		return nil
	}

	if !aggregation.IsValid() {
		return database.ErrInvalidAggregation
	}

	tzName := timezone.Name
	if tzName == "" {
		tzName = "UTC"
	}

	aggFunc := aggregateToPG(aggregation)
	dayOffsetSeconds := int(dayOffset.Seconds())

	// USER_TIME is stored as a naive UTC timestamp; see LoadUserTimeData above for why we
	// reinterpret it via "AT TIME ZONE 'UTC'" and shift by dayOffsetSeconds before truncating.
	sql := `
		SELECT
			bm.NAME AS METRIC,
			date_trunc(
				?,
				(bl.USER_TIME AT TIME ZONE 'UTC') - (? * INTERVAL '1 second'),
				?
			) + (? * INTERVAL '1 second')  AS BUCKET,
			` + aggFunc + `(blm.VALUE)      AS VALUE

		FROM PON.USER_BODY_METRIC bm

		JOIN PON.USER_BODYLOG_METRIC blm
		ON blm.BODY_METRIC_ID = bm.ID

		JOIN PON.USER_BODYLOG bl
		ON bl.ID = blm.BODYLOG_ID

		WHERE
			bm.NAME IN (?)
			AND bm.USER_ID = ?
			AND bl.USER_ID = ?
			AND bl.USER_TIME >= ?
			AND bl.USER_TIME <= ?

		GROUP BY bm.NAME, BUCKET
		ORDER BY BUCKET ASC
	`

	log.Debug().
		Str("groupby", groupbyToPG(groupby)).
		Str("aggregation", aggFunc).
		Str("timezone", tzName).
		Int("dayOffsetSeconds", dayOffsetSeconds).
		Msg("running bodylog time stats agg")

	query, args, err := sqlx.In(sql,
		groupbyToPG(groupby), dayOffsetSeconds, tzName, dayOffsetSeconds,
		metricNames, userID, userID, startTime.UTC(), endTime.UTC(),
	)

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
