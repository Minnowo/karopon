package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserGoal(w http.ResponseWriter, r *http.Request) {

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

	if err := a.Db.DeleteUserGoal(r.Context(), user.ID, goal.ID); err != nil {

		api.ServerErr(w, "Unexpected error deleting the goal from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error deleting a user's goal from the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
