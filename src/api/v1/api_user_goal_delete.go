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
		api.WriteNoUserProblem(w)
		return
	}

	var goal database.TblUserGoal

	err := json.NewDecoder(r.Body).Decode(&goal)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if goal.ID <= 0 {
		api.WriteStatusProblem(w, http.StatusBadRequest, "This goal could not be found. Reload the page and try again.")
		return
	}

	if err := a.Db.DeleteUserGoal(r.Context(), user.ID, goal.ID); err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The goal could not be deleted. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error deleting a user's goal from the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
