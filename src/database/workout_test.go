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
