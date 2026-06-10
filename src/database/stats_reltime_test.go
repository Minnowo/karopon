package database

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// refTime is a fixed reference point: Friday 2026-04-17 18:05:00 UTC.
// Week started Monday 2026-04-13.
var refTime = time.Date(2026, 4, 17, 18, 5, 0, 0, time.UTC)

func mustParse(t *testing.T, expr string, now time.Time, shift time.Duration) time.Time {
	t.Helper()
	got, err := ParseRelativeTimeExpr(expr, now, shift)
	require.NoError(t, err)
	return got
}

// noShift calls ParseRelativeTimeExpr with zero shift and unadjusted now
// (simulates a user with DayTimeOffsetSeconds=0).
func noShift(t *testing.T, expr string) time.Time {
	t.Helper()
	return mustParse(t, expr, refTime, 0)
}

func TestParseRelativeTimeExpr_Now(t *testing.T) {
	got := noShift(t, "now")
	assert.Equal(t, refTime, got)
}

func TestParseRelativeTimeExpr_Hours(t *testing.T) {
	// now-0h: clamp to start of current hour
	assert.Equal(t, time.Date(2026, 4, 17, 18, 0, 0, 0, time.UTC), noShift(t, "now-0h"))
	// now-1h: start of previous hour
	assert.Equal(t, time.Date(2026, 4, 17, 17, 0, 0, 0, time.UTC), noShift(t, "now-1h"))
	// now+1h: start of next hour
	assert.Equal(t, time.Date(2026, 4, 17, 19, 0, 0, 0, time.UTC), noShift(t, "now+1h"))
}

func TestParseRelativeTimeExpr_Days(t *testing.T) {
	// now-0d: start of today
	assert.Equal(t, time.Date(2026, 4, 17, 0, 0, 0, 0, time.UTC), noShift(t, "now-0d"))
	// now-1d: start of yesterday
	assert.Equal(t, time.Date(2026, 4, 16, 0, 0, 0, 0, time.UTC), noShift(t, "now-1d"))
	// now+1d: start of tomorrow
	assert.Equal(t, time.Date(2026, 4, 18, 0, 0, 0, 0, time.UTC), noShift(t, "now+1d"))
	// now-7d
	assert.Equal(t, time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC), noShift(t, "now-7d"))
}

func TestParseRelativeTimeExpr_Weeks(t *testing.T) {
	// Week follows the same pattern as ParseGoalTimeExpression baseWeek: shift is
	// added to now first, then the result walks back to Monday — the sub-day time
	// component is preserved (unlike day/month/year which snap to midnight).
	// With zero shift, refTime=18:05, so the Monday boundary retains 18:05.
	//
	// now-0w: Monday of this week at the same time-of-day
	assert.Equal(t, time.Date(2026, 4, 13, 18, 5, 0, 0, time.UTC), noShift(t, "now-0w"))
	// now-1w: Monday of last week
	assert.Equal(t, time.Date(2026, 4, 6, 18, 5, 0, 0, time.UTC), noShift(t, "now-1w"))
	// now+1w: Monday of next week
	assert.Equal(t, time.Date(2026, 4, 20, 18, 5, 0, 0, time.UTC), noShift(t, "now+1w"))
}

func TestParseRelativeTimeExpr_Months(t *testing.T) {
	// now-0m: first of this month
	assert.Equal(t, time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC), noShift(t, "now-0m"))
	// now-1m: first of last month
	assert.Equal(t, time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC), noShift(t, "now-1m"))
	// now+1m: first of next month
	assert.Equal(t, time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC), noShift(t, "now+1m"))
}

func TestParseRelativeTimeExpr_Years(t *testing.T) {
	// now-0y: Jan 1 of this year
	assert.Equal(t, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), noShift(t, "now-0y"))
	// now-1y: Jan 1 of last year
	assert.Equal(t, time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), noShift(t, "now-1y"))
	// now+1y: Jan 1 of next year
	assert.Equal(t, time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC), noShift(t, "now+1y"))
}

// TestParseRelativeTimeExpr_DayOffset verifies the day-offset semantics.
//
// DayTimeOffsetSeconds is NOT a UTC offset. It marks when the user considers
// the start of their day. For offset=7200 (2h), the user's day boundary is 2am UTC.
//
// The handler subtracts shift from real-now before calling so that date-component
// operations snap to the user's perceived day; the function adds shift back.
func TestParseRelativeTimeExpr_DayOffset(t *testing.T) {
	shift := 2 * time.Hour // DayTimeOffsetSeconds = 7200

	// Real time is 2026-04-17 01:30 UTC — still the user's "previous day"
	// because 01:30 < 02:00 (the user's day start).
	realNow := time.Date(2026, 4, 17, 1, 30, 0, 0, time.UTC)
	adjustedNow := realNow.Add(-shift) // 2026-04-16 23:30 UTC

	// now-0d should yield start of the user's perceived "today" (Apr 16) at 2am UTC.
	got, err := ParseRelativeTimeExpr("now-0d", adjustedNow, shift)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 4, 16, 2, 0, 0, 0, time.UTC), got)

	// now-1d should yield start of the user's "yesterday" (Apr 15) at 2am UTC.
	got, err = ParseRelativeTimeExpr("now-1d", adjustedNow, shift)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 4, 15, 2, 0, 0, 0, time.UTC), got)

	// Real time is 2026-04-17 03:00 UTC — the user is now in their "new day" (Apr 17).
	realNow2 := time.Date(2026, 4, 17, 3, 0, 0, 0, time.UTC)
	adjustedNow2 := realNow2.Add(-shift) // 2026-04-17 01:00 UTC

	got, err = ParseRelativeTimeExpr("now-0d", adjustedNow2, shift)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 4, 17, 2, 0, 0, 0, time.UTC), got)
}

func TestParseRelativeTimeExpr_Invalid(t *testing.T) {
	cases := []string{
		"",
		"yesterday",
		"now-",
		"now-1",  // missing unit
		"now-1x", // unknown unit
		"now1d",  // missing sign
		"now--1d",
	}

	for _, expr := range cases {
		_, err := ParseRelativeTimeExpr(expr, refTime, 0)
		assert.Error(t, err, "expected error for %q", expr)
	}
}
