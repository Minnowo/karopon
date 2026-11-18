package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) addUserWorkout(w http.ResponseWriter, r *http.Request) {

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

	if err := validateWorkout(&req); err != nil {
		writeWorkoutProblem(w, err)
		return
	}

	req.Workout.UserID = user.ID

	id, err := a.Db.AddUserWorkout(r.Context(), &req.Workout, req.Tags)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new workout")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The workout could not be saved. Try again.")

		return
	}

	req.Workout.ID = id

	api.WriteJSONObj(w, req)
}
