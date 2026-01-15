package database

import (
	"fmt"
	"strings"
	"time"
)

// GoalTargetColumn defines valid database table mappings for the target goal.
// These are not real columns, they must be mapped to columns / calulated values via the database implementation.
type GoalTargetColumn string

const (
	TargetColumnCalories GoalTargetColumn = "CALORIES"
	TargetColumnNetCarbs GoalTargetColumn = "NET_CARBS"
	TargetColumnFat      GoalTargetColumn = "FAT"
	TargetColumnCarbs    GoalTargetColumn = "CARBS"
	TargetColumnFibre    GoalTargetColumn = "FIBRE"
	TargetColumnProtein  GoalTargetColumn = "PROTEIN"
)

func (a GoalTargetColumn) IsValid() bool {
	switch a {
	case
		TargetColumnCalories,
		TargetColumnNetCarbs,
		TargetColumnFat,
		TargetColumnCarbs,
		TargetColumnFibre,
		TargetColumnProtein:
		return true
	default:
		return false
	}
}

// GoalAggregationFunc defines what aggregation function is used to generate the current value of achieving a goal.
type GoalAggregationFunc string

const (
	AggregationSum GoalAggregationFunc = "SUM"
	AggregationAvg GoalAggregationFunc = "AVG"
	AggregationMin GoalAggregationFunc = "MIN"
	AggregationMax GoalAggregationFunc = "MAX"
)

func (a GoalAggregationFunc) IsValid() bool {
	switch a {
	case AggregationSum, AggregationAvg, AggregationMin, AggregationMax:
		return true
	default:
		return false
	}
}

// GoalValueComparison determines how the current goal value is compared to the target goal value.
type GoalValueComparison string

const (
	ComparisonEQ       GoalValueComparison = "EQUAL_TO"
	ComparisonLessThan GoalValueComparison = "LESS_THAN"
	ComparisonMoreThan GoalValueComparison = "GREATER_THAN"
	ComparisonLessEq   GoalValueComparison = "LESS_THAN_OR_EQUAL_TO"
	ComparisonMoreEq   GoalValueComparison = "GREATER_THAN_OR_EQUAL_TO"
)

func (v GoalValueComparison) IsValid() bool {
	switch v {
	case ComparisonEQ, ComparisonLessThan, ComparisonMoreThan,
		ComparisonLessEq, ComparisonMoreEq:
		return true
	default:
		return false
	}
}

//
// =======================
// Time Parsing
// =======================
//

// Supported base time units
type timeBase string

const (
	baseHour  timeBase = "HOURLY"  // time at 0th minute of the hour
	baseToday timeBase = "DAILY"   // time at 00:00 (12:00am) of the current day
	baseWeek  timeBase = "WEEKLY"  // time at first day of the week (monday)
	baseMonth timeBase = "MONTHLY" // time at first day of the month (monday)
	baseYear  timeBase = "YEARLY"  // time at first day of the year (jan-01)
)

// ParseTimeExpression converts the base time into a range.
// Returns startTime, stopTime, or error
func ParseGoalTimeExpression(expr string, now time.Time) (time.Time, time.Time, error) {

	base := timeBase(strings.ToUpper(expr))

	switch base {

	default:
		return time.Time{}, time.Time{}, fmt.Errorf("Time unit %s is invalid", base)

	case baseToday:

		t1 := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		t2 := t1.AddDate(0, 0, 1)

		return t1, t2, nil

	case baseHour:

		t1 := now.Truncate(time.Hour)
		t2 := t1.Add(time.Hour)

		return t1, t2, nil

	case baseWeek:

		t1 := now

		for t1.Weekday() != time.Monday {
			t1 = t1.AddDate(0, 0, -1)
		}

		t2 := t1.AddDate(0, 0, 7)

		return t1, t2, nil

	case baseMonth:

		t1 := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		t2 := t1.AddDate(0, 1, 0)

		return t1, t2, nil

	case baseYear:

		t1 := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		t2 := t1.AddDate(1, 0, 0)

		return t1, t2, nil
	}
}
