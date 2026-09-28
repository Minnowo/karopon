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
		api.BadReq(w, "no user session available")
		return
	}

	var req database.WorkoutWithTags

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if err := validateWorkout(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req.Workout.UserID = user.ID

	id, err := a.Db.AddUserWorkout(r.Context(), &req.Workout, req.Tags)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new workout")
		api.ServerErr(w, "failed to create the workout in the database")

		return
	}

	req.Workout.ID = id

	api.WriteJSONObj(w, req)
}
