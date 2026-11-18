package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserTags(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var tags []database.TblUserTag

	if err := a.Db.LoadUserTags(r.Context(), user.ID, &tags); err != nil {

		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your tags could not be loaded. Reload the page to try again.",
		)
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's tags from the database")

		return
	}

	api.WriteJSONArr(w, tags)
}
