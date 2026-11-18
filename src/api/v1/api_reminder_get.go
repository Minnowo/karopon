package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserReminders(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var reminders []database.ReminderWithActivities

	err := a.Db.LoadUserReminders(r.Context(), user.ID, &reminders)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user reminders")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your reminders could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, reminders)
}
