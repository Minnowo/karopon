package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) addUserReminder(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req database.NewUserReminder

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if req.Reminder.IntervalMinutes <= 0 {
		http.Error(w, "interval_minutes cannot be <= 0", http.StatusBadRequest)
		return
	}

	req.Reminder.ID = -1
	req.Reminder.UserID = user.ID

	if req.Reminder.LastActivityAt.Time().IsZero() {
		req.Reminder.LastActivityAt = database.TimeMillis(time.Now())
	}

	newID, err := a.Db.AddUserReminder(r.Context(), &req.Reminder, req.ActivityIDs)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new reminder")
		api.ServerErr(w, "failed to create the reminder in the database")

		return
	}

	req.Reminder.ID = newID

	api.WriteJSONObj(w, req.Reminder)
}
