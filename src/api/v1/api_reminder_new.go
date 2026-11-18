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
		api.WriteNoUserProblem(w)
		return
	}

	var req database.NewUserReminder

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	req.Reminder.ID = -1
	req.Reminder.UserID = user.ID

	if req.Reminder.LastActivityAt.Time().IsZero() {
		req.Reminder.LastActivityAt = database.TimeMillis(time.Now())
	}

	errs, err := reminderFieldProblems(&req.Reminder, "#/reminder/")

	// Only new reminders need a name: reminders made before names existed have
	// an empty one and must still be updatable (e.g. by the reminder prompt).
	if len(req.Reminder.Name) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/reminder/name", Detail: "Enter a name for the reminder."})
	}

	if err != nil {

		log.Debug().Err(err).Msg("reminder active timers rejected")
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The reminder could not be read. Reload the page and try again.",
		)

		return
	}

	if len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	newID, err := a.Db.AddUserReminder(r.Context(), &req.Reminder, req.ActivityIDs)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new reminder")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The reminder could not be saved. Try again.")

		return
	}

	req.Reminder.ID = newID

	api.WriteJSONObj(w, req.Reminder)
}
