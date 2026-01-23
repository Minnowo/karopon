package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserTagNamespaces(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var tags []string

	if err := a.Db.LoadUserTagNamespaces(r.Context(), user.ID, &tags); err != nil {
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
