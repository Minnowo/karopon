package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

type EventLogStatsRequest struct {
	Start         string            `json:"start"`
	End           string            `json:"end"`
	GroupBy       string            `json:"groupby"`
	AggregateFunc string            `json:"aggregate"`
	Timezone      database.Timezone `json:"timezone"`
}

func (a *APIV1) postEventLogStats(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req EventLogStatsRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Debug().Err(err).Msg("Invalid json.")
		api.WriteUnreadableProblem(w)
		return
	}

	groupBy := database.GroupBy(req.GroupBy)
	if !groupBy.IsValid() {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This chart's settings are not valid. Edit the chart and save it again.",
		)

		return
	}

	aggregation := database.AggregationFunc(req.AggregateFunc)
	if !aggregation.IsValid() {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This chart's settings are not valid. Edit the chart and save it again.",
		)

		return
	}

	// Mirror postStatsTime: subtract the day offset so that date-component operations
	// inside ParseRelativeTimeExpr reflect the user's perceived current day, then the
	// shift is added back inside the function.
	// DayTimeOffsetSeconds is NOT a UTC offset - it marks when the user's day starts.
	shift := time.Duration(user.DayTimeOffsetSeconds) * time.Second
	adjustedNow := req.Timezone.TimeNowDayOffsetShifted(shift)

	startTime, err := database.ParseRelativeTimeExpr(req.Start, adjustedNow, shift)
	if err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The chart's start time could not be understood. Edit the chart's time range.",
		)

		return
	}

	endTime, err := database.ParseRelativeTimeExpr(req.End, adjustedNow, shift)
	if err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The chart's end time could not be understood. Edit the chart's time range.",
		)

		return
	}

	log.Info().
		Str("start", req.Start).
		Str("stop", req.End).
		Time("startt", startTime).
		Time("stopt", endTime).
		Int("shift", int(shift)).
		Time("nowAdj", adjustedNow).
		Msg("running user eventlog stats")

	var data []database.EventLogPoint
	err = a.Db.LoadUserEventLogTimeData(
		r.Context(),
		user.ID,
		startTime,
		endTime,
		aggregation,
		groupBy,
		req.Timezone,
		shift,
		&data,
	)

	if err != nil {
		log.Error().Err(err).Msg("")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"The chart could not be loaded. Reload the page to try again.",
		)
	} else {
		api.WriteJSONArr(w, data)
	}
}
