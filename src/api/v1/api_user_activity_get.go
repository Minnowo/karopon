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
		api.BadReq(w, "no user session available")
		return
	}

	var activities []database.ActivityWithTag

	err := a.Db.LoadUserActivities(r.Context(), user.ID, &activities)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user activities")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, activities)
}
