package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserFoods(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var foodlog []database.TblUserFood

	err := a.Db.LoadUserFoods(r.Context(), user.ID, &foodlog)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user food log")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, foodlog)
}
