package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserNamespaceTagSearch(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	namespace := strings.TrimSpace(r.URL.Query().Get("namespace"))
	queryString := strings.TrimSpace(r.URL.Query().Get("s"))
	limitString := strings.TrimSpace(r.URL.Query().Get("n"))

	if len(namespace) <= 0 || len(namespace) > 128 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

	if len(queryString) > 128 {
		api.WriteStatusProblem(w, http.StatusBadRequest, "Search for at most 128 characters.")
		return
	}

	limit := math.MaxInt

	if n, err := strconv.Atoi(limitString); err == nil {
		if n == 0 {
			limit = 30 // TODO: user configurable default
		} else if n > 0 {
			limit = n
		}
	}

	var tags []database.TblUserTag

	err := a.Db.LoadUserNamespaceTagsLikeN(r.Context(), user.ID, namespace, queryString, limit, &tags)

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The tag search failed. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's tags from the database")

		return
	}

	api.WriteJSONArr(w, tags)
}
