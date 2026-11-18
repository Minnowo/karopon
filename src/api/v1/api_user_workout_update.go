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

func (a *APIV1) updateUserWorkout(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.WorkoutWithTags

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if req.Workout.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This workout could not be found. Reload the page and try again.",
		)

		return
	}

	if err := validateWorkout(&req); err != nil {
		writeWorkoutProblem(w, err)
		return
	}

	req.Workout.UserID = user.ID

	err := a.Db.UpdateUserWorkout(r.Context(), &req.Workout, req.Tags)

	if errors.Is(err, database.ErrUserDoesNotHaveThisID) {
		api.WriteStatusProblem(w, http.StatusConflict, "This workout no longer exists. Reload the page and try again.")
		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update workout")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The workout could not be saved. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
