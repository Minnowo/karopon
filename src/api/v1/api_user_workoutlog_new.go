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
		api.BadReq(w, "no user session available")
		return
	}

	var req database.NewWorkoutLog

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if err := validateNewWorkoutLog(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req.WorkoutLog.UserID = user.ID

	id, err := a.Db.AddUserWorkoutLog(r.Context(), &req)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new workout log")
		api.ServerErr(w, "failed to create the workout log in the database")

		return
	}

	var out database.WorkoutLogWithSteps

	if err := a.Db.LoadUserWorkoutLog(r.Context(), user.ID, id, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("workoutlogID", id).Msg("failed to read a new workout log")
		api.ServerErr(w, "the workout log was saved, but failed to read it back")

		return
	}

	api.WriteJSONObj(w, out)
}
