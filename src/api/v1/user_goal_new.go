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

func (a *APIV1) newUserGoal(w http.ResponseWriter, r *http.Request) {

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

	id, err := a.Db.AddUserGoal(r.Context(), &goal)

	if err != nil {

		api.ServerErr(w, "Unexpected error adding the goal to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error adding a user's goal to the database")

		return
	}

	goal.ID = id

	api.WriteJSONObj(w, goal)
}
