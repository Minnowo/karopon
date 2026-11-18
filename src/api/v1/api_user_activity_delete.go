package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserActivity(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var activity database.TblUserActivity

	err := json.NewDecoder(r.Body).Decode(&activity)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if activity.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This activity could not be found. Reload the page and try again.",
		)

		return
	}

	err = a.Db.DeleteUserActivity(r.Context(), user.ID, activity.ID)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("activityID", activity.ID).Msg("failed to delete activity")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The activity could not be deleted. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
