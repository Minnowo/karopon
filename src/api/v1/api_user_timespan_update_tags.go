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
		api.WriteNoUserProblem(w)
		return
	}

	var timespan database.TaggedTimespan

	err := json.NewDecoder(r.Body).Decode(&timespan)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	timespan.Timespan.UserID = user.ID

	err = a.Db.SetUserTimespanTags(r.Context(), user.ID, timespan.Timespan.ID, timespan.Tags)

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The timer's tags could not be saved. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error updating a user's timespan")

		return
	}

	w.WriteHeader(http.StatusOK)
}
