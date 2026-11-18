package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserActivities(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var activities []database.ActivityWithTag

	err := a.Db.LoadUserActivities(r.Context(), user.ID, &activities)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user activities")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your activities could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, activities)
}
