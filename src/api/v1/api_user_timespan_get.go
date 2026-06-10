package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserTimespans(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var timespans []database.TblUserTimespan

	if err := a.Db.LoadUserTimespans(r.Context(), user.ID, &timespans); err != nil {

		api.ServerErr(w, "Unexpected error reading the tags from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's tags from the database")

		return
	}

	api.WriteJSONArr(w, timespans)
}
