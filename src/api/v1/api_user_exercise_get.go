package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserExercises(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var out []database.ExerciseWithTags

	if err := a.Db.LoadUserExercises(r.Context(), user.ID, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user exercises")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, out)
}
