package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserEventFoodLogs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var eventlogs []database.UserEventFoodLog

	n, offset, err := parseListPage(r, user.EventHistoryFetchLimit)

	if err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

	err = a.Db.LoadUserEventFoodLogsN(r.Context(), user.ID, n, offset, &eventlogs)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user event logs and their food")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your events could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, eventlogs)
}
