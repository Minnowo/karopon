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
		api.BadReq(w, "no user session available")
		return
	}

	var reminders []database.ReminderWithActivities

	err := a.Db.LoadUserReminders(r.Context(), user.ID, &reminders)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user reminders")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, reminders)
}
