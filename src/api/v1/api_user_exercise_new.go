package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) addUserExercise(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.ExerciseWithTags

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if err := validateExercise(&req); err != nil {
		writeWorkoutProblem(w, err)
		return
	}

	req.Exercise.UserID = user.ID

	id, err := a.Db.AddUserExercise(r.Context(), &req.Exercise, req.Tags)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new exercise")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The exercise could not be saved. Try again.")

		return
	}

	req.Exercise.ID = id

	api.WriteJSONObj(w, req)
}
