package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserTagColors(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var colors []database.TblUserTagColor

	if err := a.Db.LoadUserTagColors(r.Context(), user.ID, &colors); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user tag colors")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your tag colors could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, colors)
}
