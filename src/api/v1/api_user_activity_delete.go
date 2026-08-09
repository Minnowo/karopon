package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserActivity(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var activity database.TblUserActivity

	err := json.NewDecoder(r.Body).Decode(&activity)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if activity.ID <= 0 {
		http.Error(w, "activity has an invalid ID <= 0", http.StatusBadRequest)
		return
	}

	err = a.Db.DeleteUserActivity(r.Context(), user.ID, activity.ID)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("activityID", activity.ID).Msg("failed to delete activity")
		api.ServerErr(w, "failed to delete the activity in the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
