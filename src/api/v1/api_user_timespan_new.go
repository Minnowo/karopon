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
		api.WriteNoUserProblem(w)
		return
	}

	var tag database.TaggedTimespan

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if tag.Timespan.Note != nil {
		trimmed := strings.TrimSpace(*tag.Timespan.Note)
		tag.Timespan.Note = &trimmed
	}

	// A running timer has no stop time yet (zero); only a set stop time can be out of order.
	if !tag.Timespan.StopTime.Time().IsZero() && tag.Timespan.StartTime.Time().After(tag.Timespan.StopTime.Time()) {
		api.WriteValidationProblem(w, []api.FieldProblem{{
			Pointer: "#/timespan/stop_time",
			Detail:  "The end time is before the start time. Change one of them.",
		}})

		return
	}

	tag.Timespan.UserID = user.ID

	id, err := a.Db.AddUserTimespan(r.Context(), &tag.Timespan, tag.Tags)

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The timer could not be saved. Try again.")
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
