package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserEventLogs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var eventlog []database.TblUserEventLog

	err := a.Db.LoadUserEventLogs(r.Context(), user.ID, &eventlog)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user event log")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your events could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, eventlog)
}
