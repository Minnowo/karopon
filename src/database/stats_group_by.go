package database

import "errors"

var (
	ErrInvalidGroupBy = errors.New("invalid stats bucket granularity")
)

type GroupBy string

const (
	GroupBySecond GroupBy = "SECOND"
	GroupByMinute GroupBy = "MINUTE"
	GroupByHour   GroupBy = "HOUR"
	GroupByDay    GroupBy = "DAY"
	GroupByWeek   GroupBy = "WEEK"
	GroupByMonth  GroupBy = "MONTH"
	GroupByYear   GroupBy = "YEAR"

	// GroupByOne means to group everything into the same bucket
	GroupByOne GroupBy = "ONE"
)

func (s GroupBy) IsValid() bool {
	switch s {
	case GroupBySecond, GroupByMinute, GroupByHour, GroupByDay,
		GroupByWeek, GroupByMonth, GroupByYear, GroupByOne:
		return true
	default:
		return false
	}
}
