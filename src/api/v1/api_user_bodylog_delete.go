package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserBodyLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var event database.TblUserBodyLog

	err := json.NewDecoder(r.Body).Decode(&event)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if event.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This body log could not be found. Reload the page and try again.",
		)

		return
	}

	if err := a.Db.DeleteUserBodyLog(r.Context(), user.ID, event.ID); err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The body log could not be deleted. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error deleting a user's bodylog from the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
