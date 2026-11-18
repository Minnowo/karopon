package v1

import (
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
		api.WriteNoUserProblem(w)
		return
	}

	vars := mux.Vars(r)

	var dataSourceID int
	var queryString string

	if idStr, ok := vars["id"]; !ok {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	} else if id, err := strconv.Atoi(idStr); err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	} else {
		dataSourceID = id
	}

	if queryStr, ok := vars["query"]; !ok {
		api.WriteStatusProblem(w, http.StatusBadRequest, "Enter something to search for.")
		return
	} else {
		queryString = strings.TrimSpace(queryStr)
	}

	if len(queryString) <= 0 || len(queryString) > 255 {
		api.WriteStatusProblem(w, http.StatusBadRequest, "Search for something between 1 and 255 characters long.")
		return
	}

	var dataSources []database.TblDataSourceFood

	if err := a.Db.LoadDataSourceFoodBySimilarName(r.Context(), dataSourceID, queryString, &dataSources); err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Int("dataSourceID", dataSourceID).
			Str("query", queryString).
			Msg("failed to read data source food")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The search failed. Try again.")

		return
	}

	api.WriteJSONArr(w, dataSources)
}
