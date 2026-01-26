package v1

import (
	"encoding/json"
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
		api.BadReq(w, "no user session available")
		return
	}

	namespace := strings.TrimSpace(r.URL.Query().Get("namespace"))
	queryString := strings.TrimSpace(r.URL.Query().Get("name"))
	limitString := strings.TrimSpace(r.URL.Query().Get("n"))

	if len(namespace) <= 0 || len(namespace) > 128 {
		api.BadReq(w, "The namespace string is an invalid length.")
		return
	}

	if len(queryString) > 128 {
		api.BadReq(w, "The query string is an invalid length.")
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

	if err := a.Db.LoadUserNamespaceTagsLikeN(r.Context(), user.ID, namespace, queryString, limit, &tags); err != nil {
		api.ServerErr(w, "Unexpected error reading the tags from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's tags from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if len(tags) == 0 {
		w.Write([]byte("[]"))
	} else {
		json.NewEncoder(w).Encode(tags)
	}
}
