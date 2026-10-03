package database

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestSegmentsSeconds(t *testing.T) {

	seg := func(start, stop int64) TimeSegment {
		return TimeSegment{
			StartTime: TimeMillis(time.UnixMilli(start)),
			StopTime:  TimeMillis(time.UnixMilli(stop)),
		}
	}

	assert.Equal(t, 0, SegmentsSeconds(nil))
	assert.Equal(t, 20, SegmentsSeconds([]TimeSegment{seg(0, 5_000), seg(8_000, 23_000)}))
	assert.Equal(t, 20, SegmentsSeconds([]TimeSegment{seg(0, 10_400), seg(20_000, 30_000)}))
	assert.Equal(t, 21, SegmentsSeconds([]TimeSegment{seg(0, 10_300), seg(20_000, 30_300)}))
}

func TestGroupWorkoutTimespans(t *testing.T) {

	seg := func(start, stop int64) TimeSegment {
		return TimeSegment{
			StartTime: TimeMillis(time.UnixMilli(start)),
			StopTime:  TimeMillis(time.UnixMilli(stop)),
		}
	}

	a := TblUserTag{Namespace: "a", Name: "x"}
	b := TblUserTag{Namespace: "b", Name: "y"}

	steps := []NewWorkoutLogStep{
		{Segments: []TimeSegment{seg(1_000, 6_000), seg(8_000, 10_000)}, Tags: []TblUserTag{a, b}},
		{Segments: []TimeSegment{seg(10_000, 20_000)}},
		{Segments: []TimeSegment{seg(20_000, 25_000)}, Tags: []TblUserTag{b}},
		{Segments: []TimeSegment{seg(25_000, 28_000)}, Tags: []TblUserTag{b, a}},
		{Tags: []TblUserTag{a}},
	}

	out := GroupWorkoutTimespans(7, steps)

	assert.Len(t, out, 2)

	assert.Equal(t, []TblUserTag{a, b}, out[0].Tags)
	assert.Equal(t, 7, out[0].Timespan.UserID)
	assert.Equal(t, int64(1_000), out[0].Timespan.StartTime.Time().UnixMilli())
	assert.Equal(t, int64(11_000), out[0].Timespan.StopTime.Time().UnixMilli())

	assert.Equal(t, []TblUserTag{b}, out[1].Tags)
	assert.Equal(t, int64(20_000), out[1].Timespan.StartTime.Time().UnixMilli())
	assert.Equal(t, int64(25_000), out[1].Timespan.StopTime.Time().UnixMilli())

	assert.Empty(t, GroupWorkoutTimespans(7, nil))
}
