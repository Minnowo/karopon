package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserReminder(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var reminder database.TblUserReminder

	err := json.NewDecoder(r.Body).Decode(&reminder)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if reminder.ID <= 0 {
		http.Error(w, "reminder has an invalid ID <= 0", http.StatusBadRequest)
		return
	}

	err = a.Db.DeleteUserReminder(r.Context(), user.ID, reminder.ID)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("reminderID", reminder.ID).Msg("failed to delete reminder")
		api.ServerErr(w, "failed to delete the reminder in the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
