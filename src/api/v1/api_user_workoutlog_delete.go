package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserWorkoutLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.TblUserWorkoutLog

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if req.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This workout log could not be found. Reload the page and try again.",
		)

		return
	}

	if err := a.Db.DeleteUserWorkoutLog(r.Context(), user.ID, req.ID); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("workoutlogID", req.ID).Msg("failed to delete workout log")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The workout log could not be deleted. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
