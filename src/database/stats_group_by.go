package database

import "errors"

var (
	ErrInvalidGroupBy = errors.New("invalid stats bucket granularity")
)

type GroupBy string

const (
	// GroupByOne means to group everything into the same bucket
	GroupByOne GroupBy = "ONE"

	GroupBySecond GroupBy = "SECOND"
	GroupByMinute GroupBy = "MINUTE"
	GroupByHour   GroupBy = "HOUR"
	GroupByDay    GroupBy = "DAY"
	GroupByWeek   GroupBy = "WEEK"
	GroupByMonth  GroupBy = "MONTH"
	GroupByYear   GroupBy = "YEAR"
)

func (s GroupBy) IsValid() bool {
	switch s {
	case GroupByOne, GroupBySecond, GroupByMinute, GroupByHour, GroupByDay,
		GroupByWeek, GroupByMonth, GroupByYear:
		return true
	default:
		return false
	}
}
