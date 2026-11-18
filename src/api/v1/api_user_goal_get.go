package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserGoals(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var goals []database.TblUserGoal

	if err := a.Db.LoadUserGoals(r.Context(), user.ID, &goals); err != nil {

		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your goals could not be loaded. Reload the page to try again.",
		)
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's goals from the database")

		return
	}

	api.WriteJSONArr(w, goals)
}
