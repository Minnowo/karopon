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

	type acc struct {
		n   int64
		sum int64
		min int64
		max int64
	}

	accs := make(map[bucketKey]*acc)

	for _, r := range rows {

		k := bucketKey{tag: r.Tag, bucket: truncateToBucket(r.StartTime.Time(), groupby, timezone.Loc(), dayOffset)}

		durationMilli := r.StopTime.Time().Sub(r.StartTime.Time()).Milliseconds()

		a, ok := accs[k]
		if !ok {
			a = &acc{min: durationMilli, max: durationMilli}
			accs[k] = a
		}

		a.n++
		a.sum += durationMilli
		if durationMilli < a.min {
			a.min = durationMilli
		}
		if durationMilli > a.max {
			a.max = durationMilli
		}
	}

	points := make([]database.TimespanTagDurationPoint, 0, len(accs))

	for k, a := range accs {

		var durationMilli int64

		switch aggregation {
		case database.AggregationSum:
			durationMilli = a.sum
		case database.AggregationAvg:
			durationMilli = a.sum / a.n
		case database.AggregationMin:
			durationMilli = a.min
		case database.AggregationMax:
			durationMilli = a.max
		}

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

func (db *SqliteDatabase) LoadUserBodyLogTimeData(
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

	sql := `
		SELECT
			bm.NAME      AS METRIC,
			bl.USER_TIME AS USER_TIME,
			blm.VALUE    AS VALUE

		FROM PON_USER_BODY_METRIC bm

		JOIN PON_USER_BODYLOG_METRIC blm
		ON blm.BODY_METRIC_ID = bm.ID

		JOIN PON_USER_BODYLOG bl
		ON bl.ID = blm.BODYLOG_ID

		WHERE
			bm.NAME IN (?)
			AND bm.USER_ID = ?
			AND bl.USER_ID = ?
			AND bl.USER_TIME >= ?
			AND bl.USER_TIME <= ?
	`

	query, args, err := sqlx.In(sql, metricNames, userID, userID, startTime.UTC(), endTime.UTC())

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	var rows []struct {
		Metric   string              `db:"metric"`
		UserTime database.TimeMillis `db:"user_time"`
		Value    float64             `db:"value"`
	}

	if err := db.SelectContext(ctx, &rows, query, args...); err != nil {
		return err
	}

	type bucketKey struct {
		metric string
		bucket time.Time
	}

	type acc struct {
		n   int
		sum float64
		min float64
		max float64
	}

	accs := make(map[bucketKey]*acc)

	for _, r := range rows {

		k := bucketKey{
			metric: r.Metric,
			bucket: truncateToBucket(r.UserTime.Time(), groupby, timezone.Loc(), dayOffset),
		}

		a, ok := accs[k]
		if !ok {
			a = &acc{min: r.Value, max: r.Value}
			accs[k] = a
		}

		a.n++
		a.sum += r.Value
		if r.Value < a.min {
			a.min = r.Value
		}
		if r.Value > a.max {
			a.max = r.Value
		}
	}

	points := make([]database.BodyLogMetricPoint, 0, len(accs))

	for k, a := range accs {

		var value float64

		switch aggregation {
		case database.AggregationSum:
			value = a.sum
		case database.AggregationAvg:
			value = a.sum / float64(a.n)
		case database.AggregationMin:
			value = a.min
		case database.AggregationMax:
			value = a.max
		}

		points = append(points, database.BodyLogMetricPoint{
			Metric: k.metric,
			Bucket: database.TimeMillis(k.bucket),
			Value:  value,
		})
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Bucket.Time().Before(points[j].Bucket.Time())
	})

	*out = points

	return nil
}

func (db *SqliteDatabase) LoadUserEventLogTimeData(
	ctx context.Context,
	userID int,
	startTime time.Time,
	endTime time.Time,
	aggregation database.AggregationFunc,
	groupby database.GroupBy,
	timezone database.Timezone,
	dayOffset time.Duration,
	out *[]database.EventLogPoint,
) error {

	if !aggregation.IsValid() {
		return database.ErrInvalidAggregation
	}

	sql := `
		SELECT
			USER_TIME                   AS USER_TIME,
			BLOOD_GLUCOSE                AS BLOOD_GLUCOSE,
			RECOMMENDED_INSULIN_AMOUNT   AS RECOMMENDED_INSULIN_AMOUNT,
			ACTUAL_INSULIN_TAKEN         AS ACTUAL_INSULIN_TAKEN

		FROM PON_USER_EVENTLOG

		WHERE
			USER_ID = ?
			AND USER_TIME >= ?
			AND USER_TIME <= ?
	`

	var rows []struct {
		UserTime                 database.TimeMillis `db:"user_time"`
		BloodGlucose             float64             `db:"blood_glucose"`
		RecommendedInsulinAmount float64             `db:"recommended_insulin_amount"`
		ActualInsulinTaken       float64             `db:"actual_insulin_taken"`
	}

	if err := db.SelectContext(ctx, &rows, sql, userID, startTime.UTC(), endTime.UTC()); err != nil {
		return err
	}

	const (
		idxBloodGlucose = iota
		idxRecommendedInsulinAmount
		idxActualInsulinTaken
		numSeries
	)

	type acc struct {
		n   int
		sum [numSeries]float64
		min [numSeries]float64
		max [numSeries]float64
	}

	accs := make(map[time.Time]*acc)

	for _, r := range rows {

		values := [numSeries]float64{
			r.BloodGlucose,
			r.RecommendedInsulinAmount,
			r.ActualInsulinTaken,
		}

		bucket := truncateToBucket(r.UserTime.Time(), groupby, timezone.Loc(), dayOffset)

		a, ok := accs[bucket]
		if !ok {
			a = &acc{min: values, max: values}
			accs[bucket] = a
		}

		a.n++
		for i, v := range values {
			a.sum[i] += v
			if v < a.min[i] {
				a.min[i] = v
			}
			if v > a.max[i] {
				a.max[i] = v
			}
		}
	}

	points := make([]database.EventLogPoint, 0, len(accs))

	for bucket, a := range accs {

		var values [numSeries]float64

		switch aggregation {
		case database.AggregationSum:
			values = a.sum
		case database.AggregationAvg:
			for i := range values {
				values[i] = a.sum[i] / float64(a.n)
			}
		case database.AggregationMin:
			values = a.min
		case database.AggregationMax:
			values = a.max
		}

		points = append(points, database.EventLogPoint{
			Bucket:                   database.TimeMillis(bucket),
			BloodGlucose:             values[idxBloodGlucose],
			RecommendedInsulinAmount: values[idxRecommendedInsulinAmount],
			ActualInsulinTaken:       values[idxActualInsulinTaken],
		})
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Bucket.Time().Before(points[j].Bucket.Time())
	})

	*out = points

	return nil
}

func (db *SqliteDatabase) LoadUserMacrosTimeData(
	ctx context.Context,
	userID int,
	startTime time.Time,
	endTime time.Time,
	calorieCalc database.CalorieCalcMethod,
	aggregation database.AggregationFunc,
	groupby database.GroupBy,
	timezone database.Timezone,
	dayOffset time.Duration,
	out *[]database.MacronutrientPoint,
) error {

	if !aggregation.IsValid() {
		return database.ErrInvalidAggregation
	}

	sql := `
		SELECT
			USER_TIME AS USER_TIME,
			PROTEIN   AS PROTEIN,
			CARB      AS CARB,
			FIBRE     AS FIBRE,
			FAT       AS FAT

		FROM PON_USER_FOODLOG

		WHERE
			USER_ID = ?
			AND USER_TIME >= ?
			AND USER_TIME <= ?
	`

	var rows []struct {
		UserTime database.TimeMillis `db:"user_time"`
		Protein  float64             `db:"protein"`
		Carb     float64             `db:"carb"`
		Fibre    float64             `db:"fibre"`
		Fat      float64             `db:"fat"`
	}

	if err := db.SelectContext(ctx, &rows, sql, userID, startTime.UTC(), endTime.UTC()); err != nil {
		return err
	}

	// carb, netCarb, fat, fibre, protein, calorie
	const (
		idxCarb = iota
		idxNetCarb
		idxFat
		idxFibre
		idxProtein
		idxCalorie
		numSeries
	)

	type acc struct {
		n   int
		sum [numSeries]float64
		min [numSeries]float64
		max [numSeries]float64
	}

	accs := make(map[time.Time]*acc)

	for _, r := range rows {

		netCarb := r.Carb - r.Fibre

		var calorie float64
		if calorieCalc == database.CALORIE_ATWATERNOFIBRE {
			calorie = r.Protein*4 + netCarb*4 + r.Fat*9
		} else {
			calorie = r.Protein*4 + netCarb*4 + r.Fibre*2 + r.Fat*9
		}

		values := [numSeries]float64{r.Carb, netCarb, r.Fat, r.Fibre, r.Protein, calorie}

		bucket := truncateToBucket(r.UserTime.Time(), groupby, timezone.Loc(), dayOffset)

		a, ok := accs[bucket]
		if !ok {
			a = &acc{min: values, max: values}
			accs[bucket] = a
		}

		a.n++
		for i, v := range values {
			a.sum[i] += v
			if v < a.min[i] {
				a.min[i] = v
			}
			if v > a.max[i] {
				a.max[i] = v
			}
		}
	}

	points := make([]database.MacronutrientPoint, 0, len(accs))

	for bucket, a := range accs {

		var values [numSeries]float64

		switch aggregation {
		case database.AggregationSum:
			values = a.sum
		case database.AggregationAvg:
			for i := range values {
				values[i] = a.sum[i] / float64(a.n)
			}
		case database.AggregationMin:
			values = a.min
		case database.AggregationMax:
			values = a.max
		}

		points = append(points, database.MacronutrientPoint{
			Bucket:  database.TimeMillis(bucket),
			Carb:    values[idxCarb],
			NetCarb: values[idxNetCarb],
			Fat:     values[idxFat],
			Fibre:   values[idxFibre],
			Protein: values[idxProtein],
			Calorie: values[idxCalorie],
		})
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Bucket.Time().Before(points[j].Bucket.Time())
	})

	*out = points

	return nil
}
