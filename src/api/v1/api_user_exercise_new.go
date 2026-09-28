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
		api.BadReq(w, "no user session available")
		return
	}

	var req database.ExerciseWithTags

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if err := validateExercise(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req.Exercise.UserID = user.ID

	id, err := a.Db.AddUserExercise(r.Context(), &req.Exercise, req.Tags)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new exercise")
		api.ServerErr(w, "failed to create the exercise in the database")

		return
	}

	req.Exercise.ID = id

	api.WriteJSONObj(w, req)
}
