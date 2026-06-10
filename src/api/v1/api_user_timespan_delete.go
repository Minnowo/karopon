package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserTimespan(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var timespan database.TblUserTimespan

	err := json.NewDecoder(r.Body).Decode(&timespan)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if timespan.ID <= 0 {
		api.BadReq(w, "Timespan must have a valid ID.")
		return
	}

	if err := a.Db.DeleteUserTimespan(r.Context(), user.ID, timespan.ID); err != nil {

		api.ServerErr(w, "Unexpected error deleting the timespan in the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Int("timespanID", timespan.ID).
			Msg("Unexpected error deleting a user's timespan in the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
