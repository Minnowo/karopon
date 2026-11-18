package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserDashboards(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var dashboards []database.TblUserDashboard

	err := a.Db.LoadUserDashboards(r.Context(), user.ID, &dashboards)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user dashboards")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your dashboards could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, dashboards)
}
