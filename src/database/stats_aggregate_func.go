package database

import "errors"

// AggregationFunc defines what aggregation function is used to generate the current value of achieving a goal.
type AggregationFunc string

const (
	AggregationSum AggregationFunc = "SUM"
	AggregationAvg AggregationFunc = "AVG"
	AggregationMin AggregationFunc = "MIN"
	AggregationMax AggregationFunc = "MAX"
)

var (
	ErrInvalidAggregation = errors.New("invalid goal aggregation")
)

func (a AggregationFunc) IsValid() bool {
	switch a {
	case AggregationSum, AggregationAvg, AggregationMin, AggregationMax:
		return true
	default:
		return false
	}
}
