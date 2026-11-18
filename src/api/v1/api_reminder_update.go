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
		api.WriteNoUserProblem(w)
		return
	}

	var reminder database.TblUserReminder

	err := json.NewDecoder(r.Body).Decode(&reminder)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if reminder.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This reminder could not be found. Reload the page and try again.",
		)

		return
	}

	reminder.UserID = user.ID

	errs, err := reminderFieldProblems(&reminder, "#/")

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

	err = a.Db.UpdateUserReminder(r.Context(), &reminder)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update reminder")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The reminder could not be saved. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
