package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserReminderActivities(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req database.SetUserReminderActivitiesRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if req.ReminderID <= 0 {
		http.Error(w, "reminder_id should be > 0", http.StatusBadRequest)
		return
	}

	err = a.Db.SetUserReminderActivities(r.Context(), user.ID, req.ReminderID, req.ActivityIDs)

	if err != nil {

		api.ServerErr(w, "Unexpected error updating the reminder's activities")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error updating a user's reminder activities")

		return
	}

	w.WriteHeader(http.StatusOK)
}
