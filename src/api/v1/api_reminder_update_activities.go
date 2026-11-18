package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserReminderActivities(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.SetUserReminderActivitiesRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if req.ReminderID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This reminder could not be found. Reload the page and try again.",
		)

		return
	}

	err = a.Db.SetUserReminderActivities(r.Context(), user.ID, req.ReminderID, req.ActivityIDs)

	if err != nil {

		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"The reminder's activities could not be saved. Try again.",
		)
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error updating a user's reminder activities")

		return
	}

	w.WriteHeader(http.StatusOK)
}
