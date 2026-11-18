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

	err = a.Db.DeleteUserReminder(r.Context(), user.ID, reminder.ID)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("reminderID", reminder.ID).Msg("failed to delete reminder")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The reminder could not be deleted. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
