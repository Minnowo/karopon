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

type CheckGoalProgress struct {
	database.TblUserGoal

	Timezone database.Timezone
	AsOf     database.TimeMillis `json:"as_of"`
}

func (a *APIV1) getUserGoalProgress(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var goal CheckGoalProgress

	err := json.NewDecoder(r.Body).Decode(&goal)

	if err != nil {

		log.Debug().Err(err).Msg("Invalid json.")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if !goal.Aggregation().IsValid() {
		api.BadReq(w, "Aggregation type is invalid.")
		return
	}

	if !goal.TargetColumn().IsValid() {
		api.BadReq(w, "TargetColumn is invalid.")
		return
	}

	if !goal.Comparison().IsValid() {
		api.BadReq(w, "Comparison type is invalid.")
		return
	}

	if _, _, err := goal.TimeRange(time.Now(), 0); err != nil {
		api.BadReq(w, "Time expression is invalid.")
		return
	}

	goal.UserID = user.ID

	var baseTime time.Time

	if goal.AsOf.Time().IsZero() {
		baseTime = time.Now()
	} else {
		baseTime = goal.AsOf.Time()
	}

	// If the user has set the start of the day at 2am (user.DayTimeOffsetSeconds = 2),
	// and the date is 2026-03-14 02:00, that means the current day is supposed to be 2026-03-13.
	// When goal.TimeRange generates the time range for the given timeNow,
	// it will directly pull the day value from the given time.
	//
	// So we need to subtract the DayTimeOffset for this to work.
	// This should get us start=2026-03-13:00:00 end=2026-03-14:00:00,
	// but now we need to shift this forward to account for the user's day offset again.
	//
	// Giving the final, correct range of start=2026-03-13 02:00 end=2026-03-14 02:00.
	shift := time.Second * time.Duration(user.DayTimeOffsetSeconds)
	timeNow := baseTime.Add(-shift).In(goal.Timezone.Loc())

	var goalProgress database.UserGoalProgress

	err = a.Db.LoadUserGoalProgress(r.Context(), timeNow, shift, &goal.TblUserGoal, &goalProgress)

	if err != nil {

		api.ServerErr(w, "Unexpected error getting the goal progress from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error getting a user's goal progress from the database")

		return
	}

	api.WriteJSONObj(w, goalProgress)
}
