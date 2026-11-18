package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserBodyMetric(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var metric database.TblUserBodyMetric

	err := json.NewDecoder(r.Body).Decode(&metric)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if metric.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This body metric could not be found. Reload the page and try again.",
		)

		return
	}

	if err := a.Db.DeleteUserBodyMetric(r.Context(), user.ID, metric.ID); err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The body metric could not be deleted. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error deleting a user's body metric from the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
