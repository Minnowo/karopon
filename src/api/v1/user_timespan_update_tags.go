package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserTimespanTags(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var timespan database.TaggedTimespan

	err := json.NewDecoder(r.Body).Decode(&timespan)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	timespan.Timespan.UserID = user.ID

	if err := a.Db.SetUserTimespanTags(r.Context(), &timespan.Timespan, timespan.Tags); err != nil {
		api.ServerErr(w, "Unexpected error updating the timespan")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error updating a user's timespan")
		return
	}

	w.WriteHeader(http.StatusOK)
}
