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

	if _, _, err := goal.TimeRange(time.Now()); err != nil {
		api.BadReq(w, "Time expression is invalid.")
		return
	}

	goal.UserID = user.ID

	var goalProgress database.UserGoalProgress

	err = a.Db.LoadUserGoalProgress(r.Context(), time.Now().In(goal.Timezone.Loc()), &goal.TblUserGoal, &goalProgress)

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
