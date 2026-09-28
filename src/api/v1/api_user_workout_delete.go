package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserWorkout(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req database.TblUserWorkout

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if req.ID <= 0 {
		http.Error(w, "workout has an invalid ID <= 0", http.StatusBadRequest)
		return
	}

	if err := a.Db.DeleteUserWorkout(r.Context(), user.ID, req.ID); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("workoutID", req.ID).Msg("failed to delete workout")
		api.ServerErr(w, "failed to delete the workout in the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
