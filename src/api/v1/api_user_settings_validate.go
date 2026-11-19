// Range checks for the numbers on the settings page. Each problem points at
// its field, as "#/user/<json name>".

package v1

import (
	"fmt"
	"karopon/src/api"
	"karopon/src/constants"
	"karopon/src/database"
)

// settingsNumberProblems returns a field problem for each settings number out
// of its range. The blood sugar fields are only checked while the diabetes
// settings are shown, since the page hides them otherwise.
func settingsNumberProblems(u *database.TblUser) []api.FieldProblem {

	var errs []api.FieldProblem

	add := func(field, detail string) {
		errs = append(errs, api.FieldProblem{Pointer: "#/user/" + field, Detail: detail})
	}

	if u.ShowDiabetes {
		if u.TargetBloodSugar <= 0 || u.TargetBloodSugar > constants.MAX_BLOOD_SUGAR_SETTING {
			add("target_blood_sugar", fmt.Sprintf(
				"Use a target blood sugar more than 0 and at most %g.", constants.MAX_BLOOD_SUGAR_SETTING))
		}
		if u.InsulinSensitivityFactor <= 0 || u.InsulinSensitivityFactor > constants.MAX_BLOOD_SUGAR_SETTING {
			add("insulin_sensitivity_factor", fmt.Sprintf(
				"Use an insulin sensitivity factor more than 0 and at most %g.", constants.MAX_BLOOD_SUGAR_SETTING))
		}
	}

	if u.EventLogTrailingRows < 0 || u.EventLogTrailingRows > constants.MAX_EVENT_LOG_TRAILING_ROWS {
		add("event_log_trailing_rows", fmt.Sprintf(
			"Use between 0 and %d trailing rows.", constants.MAX_EVENT_LOG_TRAILING_ROWS))
	}

	if u.EventHistoryFetchLimit < 1 || u.EventHistoryFetchLimit > constants.MAX_HISTORY_FETCH_LIMIT {
		add("event_history_fetch_limit", fmt.Sprintf(
			"Fetch between 1 and %d events.", constants.MAX_HISTORY_FETCH_LIMIT))
	}

	if u.TimespanHistoryFetchLimit < 1 || u.TimespanHistoryFetchLimit > constants.MAX_HISTORY_FETCH_LIMIT {
		add("timespan_history_fetch_limit", fmt.Sprintf(
			"Fetch between 1 and %d timers.", constants.MAX_HISTORY_FETCH_LIMIT))
	}

	if s := u.SessionExpireTimeSeconds; s < constants.MIN_SESSION_EXPIRE_SECONDS ||
		s > constants.MAX_SESSION_EXPIRE_SECONDS {
		add("session_expire_time_seconds", fmt.Sprintf(
			"Use a session length between %d hour and %d hours (10 years).",
			constants.MIN_SESSION_EXPIRE_SECONDS/3600,
			constants.MAX_SESSION_EXPIRE_SECONDS/3600,
		))
	}

	if o := u.DayTimeOffsetSeconds; o < 0 || o > constants.MAX_DAY_TIME_OFFSET_SECONDS {
		add("day_time_offset_seconds", "Use a day start offset from 0 up to, but not including, 24 hours.")
	}

	return errs
}
