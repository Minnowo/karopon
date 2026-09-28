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
		api.BadReq(w, "no user session available")
		return
	}

	var req database.WorkoutLogWithSteps

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if req.WorkoutLog.ID <= 0 {
		http.Error(w, "workout log ID should be > 0", http.StatusBadRequest)
		return
	}

	req.WorkoutLog.UserID = user.ID

	err := a.Db.UpdateUserWorkoutLog(r.Context(), &req)

	if errors.Is(err, database.ErrUserDoesNotHaveThisID) {
		http.Error(w, "workout log does not exist", http.StatusBadRequest)
		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update workout log")
		api.ServerErr(w, "failed while writing to the database")

		return
	}

	var out database.WorkoutLogWithSteps

	if err := a.Db.LoadUserWorkoutLog(r.Context(), user.ID, req.WorkoutLog.ID, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read an updated workout log")
		api.ServerErr(w, "the workout log was saved, but failed to read it back")

		return
	}

	api.WriteJSONObj(w, out)
}
