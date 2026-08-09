package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

// updateUserReminder updates a reminder's Enabled/IntervalMinutes/LastActivityAt.
// It serves settings edits as well as skip/snooze, where the client computes the
// new LastActivityAt and sends it as part of the reminder.
func (a *APIV1) updateUserReminder(w http.ResponseWriter, r *http.Request) {

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
		http.Error(w, "reminder ID should be > 0", http.StatusBadRequest)
		return
	}

	if reminder.IntervalMinutes <= 0 {
		http.Error(w, "interval_minutes cannot be <= 0", http.StatusBadRequest)
		return
	}

	reminder.UserID = user.ID

	err = a.Db.UpdateUserReminder(r.Context(), &reminder)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update reminder")
		api.ServerErr(w, "failed while writing to the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
