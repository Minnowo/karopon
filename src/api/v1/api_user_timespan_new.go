package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) newUserTimespan(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var tag database.TaggedTimespan

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if tag.Timespan.Note != nil {
		trimmed := strings.TrimSpace(*tag.Timespan.Note)
		tag.Timespan.Note = &trimmed
	}

	if tag.Timespan.StartTime.Time().After(tag.Timespan.StartTime.Time()) {
		tag.Timespan.StartTime, tag.Timespan.StopTime = tag.Timespan.StopTime, tag.Timespan.StartTime
	}

	tag.Timespan.UserID = user.ID

	id, err := a.Db.AddUserTimespan(r.Context(), &tag.Timespan, tag.Tags)

	if err != nil {

		api.ServerErr(w, "Unexpected error adding the timespan to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Time("start", tag.Timespan.StartTime.Time()).
			Time("stop", tag.Timespan.StopTime.Time()).
			Msg("Unexpected error adding a user's timespan to the database")

		return
	}

	tag.Timespan.ID = id

	api.WriteJSONObj(w, tag)
}
