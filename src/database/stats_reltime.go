package database

import (
	"fmt"
	"regexp"
	"strconv"
	"time"
)

var relTimeRe = regexp.MustCompile(`^now([+-])(\d+)([hdwmy])$`)

// ParseRelativeTimeExpr parses a relative time expression and returns the resolved time.
//
// now must already have the user's day offset subtracted (same contract as
// ParseGoalTimeExpression), so that date-component operations (Year/Month/Day)
// reflect the user's perceived current day rather than the UTC calendar day.
// shift is the user's DayTimeOffsetSeconds as a time.Duration and is added back
// after snapping, mirroring the pattern used throughout the goals system.
//
// DayTimeOffsetSeconds is NOT a UTC offset. It marks when the user considers
// the start of their day. For example, offset = 7200s means "my day starts at
// 2am UTC". Subtracting shift before calling causes date operations to snap to
// the user's perceived boundaries; adding shift back afterwards converts to UTC.
//
// Syntax: "now" | "now" ("+" | "-") N unit
// unit: h=hour  d=day  w=week  m=month  y=year
func ParseRelativeTimeExpr(expr string, now time.Time, shift time.Duration) (time.Time, error) {
	if expr == "now" {
		return now.Add(shift), nil
	}

	m := relTimeRe.FindStringSubmatch(expr)
	if m == nil {
		return time.Time{}, fmt.Errorf("invalid relative time expression: %q", expr) //nolint:err113
	}

	n, _ := strconv.Atoi(m[2])
	if m[1] == "-" {
		n = -n
	}

	switch m[3] {
	case "h":
		snap := now.Truncate(time.Hour)
		return snap.Add(shift).Add(time.Duration(n) * time.Hour), nil

	case "d":
		snap := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return snap.Add(shift).AddDate(0, 0, n), nil

	case "w":
		// Mirror ParseGoalTimeExpression baseWeek: add shift first then walk back to Monday.
		base := now.Add(shift)
		for base.Weekday() != time.Monday {
			base = base.AddDate(0, 0, -1)
		}
		return base.AddDate(0, 0, n*7), nil

	case "m":
		snap := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		return snap.Add(shift).AddDate(0, n, 0), nil

	case "y":
		snap := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		return snap.Add(shift).AddDate(n, 0, 0), nil
	}

	// Unreachable: regex constrains unit to [hdwmy].
	return time.Time{}, fmt.Errorf("unknown unit in expression: %q", expr) //nolint:err113
}
