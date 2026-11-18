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

func (a *APIV1) updateUserTimespan(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var tag database.TblUserTimespan

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if tag.Note != nil {
		trimmed := strings.TrimSpace(*tag.Note)
		tag.Note = &trimmed
	}

	// A running timer has no stop time yet (zero); only a set stop time can be out of order.
	if !tag.StopTime.Time().IsZero() && tag.StartTime.Time().After(tag.StopTime.Time()) {
		api.WriteValidationProblem(w, []api.FieldProblem{{
			Pointer: "#/stop_time",
			Detail:  "The end time is before the start time. Change one of them.",
		}})

		return
	}

	tag.UserID = user.ID

	if err := a.Db.UpdateUserTimespan(r.Context(), &tag); err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The timer could not be saved. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Time("start", tag.StartTime.Time()).
			Time("stop", tag.StopTime.Time()).
			Msg("Unexpected error updating a user's timespan")

		return
	}

	w.WriteHeader(http.StatusOK)
}
