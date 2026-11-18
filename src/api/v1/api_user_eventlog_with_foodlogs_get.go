package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"math"
	"net/http"
	"strconv"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserEventFoodLogs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var n int
	var err error
	var eventlogs []database.UserEventFoodLog

	if limit := r.URL.Query().Get("n"); limit == "" {
		err = a.Db.LoadUserEventFoodLogs(r.Context(), user.ID, &eventlogs)
	} else if n, err = strconv.Atoi(limit); err == nil {

		if n == 0 {
			n = user.EventHistoryFetchLimit
		} else if n < 0 {
			n = math.MaxInt
		}

		err = a.Db.LoadUserEventFoodLogsN(r.Context(), user.ID, n, &eventlogs)

	} else {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

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
