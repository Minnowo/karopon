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

	var tag database.TblUserTimespan

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if tag.Note != nil {
		trimmed := strings.TrimSpace(*tag.Note)
		tag.Note = &trimmed
	}

	if tag.StartTime.Time().After(tag.StartTime.Time()) {
		tmp := tag.StartTime
		tag.StartTime = tag.StopTime
		tag.StopTime = tmp
	}

	tag.UserID = user.ID

	id, err := a.Db.AddUserTimespan(r.Context(), &tag)

	if err != nil {
		api.ServerErr(w, "Unexpected error adding the timespan to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Time("start", tag.StartTime.Time()).
			Time("stop", tag.StopTime.Time()).
			Msg("Unexpected error adding a user's timespan to the database")
		return
	}

	tag.ID = id

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(tag)
}
