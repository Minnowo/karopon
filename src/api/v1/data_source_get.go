package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getDataSources(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	var dataSources []database.TblDataSource

	if err := a.Db.LoadDataSources(r.Context(), &dataSources); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read data sources")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, dataSources)
}
