package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
)

func (a *APIV1) getDataSourceFood(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	vars := mux.Vars(r)

	var dataSourceID int
	var queryString string

	if idStr, ok := vars["id"]; !ok {
		api.BadReq(w, "No data source ID given, specify the ID of the data source you wish to query.")
		return
	} else if id, err := strconv.Atoi(idStr); err != nil {
		api.BadReq(w, "Data source ID is not a valid number.")
		return
	} else {
		dataSourceID = id
	}

	if queryStr, ok := vars["query"]; !ok {
		api.BadReq(w, "No query string given, specify the query for the data source.")
		return
	}  else {
		queryString = strings.TrimSpace(queryStr)
	}

	if len(queryString) <= 0 || len(queryString) > 255 {
		api.BadReq(w, "The query string is an invalid length.")
		return
	}

	var dataSources []database.TblDataSourceFood

	if err := a.Db.LoadDataSourceFoodBySimilarName(r.Context(), dataSourceID, queryString, &dataSources); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Int("dataSourceID", dataSourceID).Str("query", queryString).Msg("failed to read data source food")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if len(dataSources) == 0 {
		w.Write([]byte("[]"))
	} else {
		json.NewEncoder(w).Encode(dataSources)
	}
}
