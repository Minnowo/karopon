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

type StatsTimeRequest struct {
	Cols          []string          `json:"columns"`
	Start         string            `json:"start"`
	End           string            `json:"end"`
	GroupBy       string            `json:"groupby"`
	AggregateFunc string            `json:"aggregate"`
	Tags          []string          `json:"tags"`
	Timezone      database.Timezone `json:"timezone"`
}

func (a *APIV1) postStatsTime(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req StatsTimeRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Debug().Err(err).Msg("Invalid json.")
		api.BadReq(w, "invalid JSON")
		return
	}

	groupBy := database.GroupBy(req.GroupBy)
	if !groupBy.IsValid() {
		api.BadReq(w, "invalid groupby")
		return
	}

	aggregation := database.AggregationFunc(req.AggregateFunc)
	if !aggregation.IsValid() {
		api.BadReq(w, "invalid aggregate")
		return
	}

	// Mirror getUserGoalProgress: subtract the day offset so that date-component
	// operations inside ParseRelativeTimeExpr reflect the user's perceived current
	// day, then shift is added back inside the function.
	// DayTimeOffsetSeconds is NOT a UTC offset - it marks when the user's day starts.
	shift := time.Duration(user.DayTimeOffsetSeconds) * time.Second
	adjustedNow := time.Now().Add(-shift).In(req.Timezone.Loc())

	startTime, err := database.ParseRelativeTimeExpr(req.Start, adjustedNow, shift)
	if err != nil {
		api.BadReq(w, "invalid start expression")
		return
	}

	endTime, err := database.ParseRelativeTimeExpr(req.End, adjustedNow, shift)
	if err != nil {
		api.BadReq(w, "invalid end expression")
		return
	}

	log.Info().
		Str("start", req.Start).
		Str("stop", req.End).
		Time("startt", startTime).
		Time("stopt", endTime).
		Int("shift", int(shift)).
		Time("nowAdj", adjustedNow).
		Msg("running user stats")

	var data []database.TimespanTagDurationPoint
	err = a.Db.LoadUserTimeData(
		r.Context(),
		user.ID,
		startTime,
		endTime,
		req.Tags,
		aggregation,
		groupBy,
		req.Timezone,
		shift,
		&data,
	)

	if err != nil {
		log.Error().Err(err).Msg("")
		api.ServerErr(w, "failed while reading from the database")
	} else {
		api.WriteJSONArr(w, data)
	}
}
