package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) addUserWorkoutLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.NewWorkoutLog

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if err := validateNewWorkoutLog(&req); err != nil {
		writeWorkoutProblem(w, err)
		return
	}

	req.WorkoutLog.UserID = user.ID

	id, err := a.Db.AddUserWorkoutLog(r.Context(), &req)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new workout log")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The workout log could not be saved. Try again.")

		return
	}

	var out database.WorkoutLogWithSteps

	if err := a.Db.LoadUserWorkoutLog(r.Context(), user.ID, id, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("workoutlogID", id).Msg("failed to read a new workout log")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"The workout log was saved, but could not be loaded back. Reload the page to see it.",
		)

		return
	}

	api.WriteJSONObj(w, out)
}
