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

func (a *APIV1) getUserTimespans(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var n int
	var err error
	var timespans []database.TblUserTimespan

	if limit := r.URL.Query().Get("n"); limit == "" {
		n = user.TimespanHistoryFetchLimit
	} else if n, err = strconv.Atoi(limit); err != nil {
		api.ServerErr(w, "Query parameter 'n' could not be parsed as an integer")
		return
	}

	if n == 0 {
		n = user.TimespanHistoryFetchLimit
	} else if n < 0 {
		n = math.MaxInt
	}

	if err := a.Db.LoadUserTimespansN(r.Context(), user.ID, n, &timespans); err != nil {

		api.ServerErr(w, "Unexpected error reading the tags from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's tags from the database")

		return
	}

	api.WriteJSONArr(w, timespans)
}
