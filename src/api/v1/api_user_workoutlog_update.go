package v1

import (
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserWorkoutLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.WorkoutLogWithSteps

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if req.WorkoutLog.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This workout log could not be found. Reload the page and try again.",
		)

		return
	}

	req.WorkoutLog.UserID = user.ID

	err := a.Db.UpdateUserWorkoutLog(r.Context(), &req)

	if errors.Is(err, database.ErrUserDoesNotHaveThisID) {
		api.WriteStatusProblem(
			w,
			http.StatusConflict,
			"This workout log no longer exists. Reload the page and try again.",
		)

		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update workout log")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The workout log could not be saved. Try again.")

		return
	}

	var out database.WorkoutLogWithSteps

	if err := a.Db.LoadUserWorkoutLog(r.Context(), user.ID, req.WorkoutLog.ID, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read an updated workout log")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"The workout log was saved, but could not be loaded back. Reload the page to see it.",
		)

		return
	}

	api.WriteJSONObj(w, out)
}
