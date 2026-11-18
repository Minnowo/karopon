package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserBodyLogs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var bodylogs []database.UserBodyLog

	err := a.Db.LoadUserBodyLogs(r.Context(), user.ID, &bodylogs)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user body log")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your body logs could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, bodylogs)
}
