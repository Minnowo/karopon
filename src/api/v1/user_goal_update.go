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

func (a *APIV1) updateUserGoal(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var goal database.TblUserGoal

	err := json.NewDecoder(r.Body).Decode(&goal)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if goal.ID <= 0 {
		api.BadReq(w, "ID should be > 0")
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

	if err := a.Db.UpdateUserGoal(r.Context(), &goal); err != nil {
		api.ServerErr(w, "Unexpected error updating the goal in the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Int("goalid", goal.ID).
			Msg("Unexpected error updating a user's goal in the database")
		return
	}

	api.WriteJSONObj(w, goal)
}
