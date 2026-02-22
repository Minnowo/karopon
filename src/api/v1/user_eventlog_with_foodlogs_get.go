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
		api.BadReq(w, "no user session available")
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
		api.ServerErr(w, "Query parameter 'n' could not be parsed as an integer")
		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user event logs and their food")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, eventlogs)
}
