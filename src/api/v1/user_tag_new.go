package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) newUserTag(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var tag database.TblUserTag

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	tag.Namespace = strings.TrimSpace(tag.Namespace)
	tag.Name = strings.TrimSpace(tag.Name)

	if tag.Namespace == "" {
		api.BadReq(w, "Tag namespace cannot be empty.")
		return
	}

	if tag.Name == "" {
		api.BadReq(w, "Tag name cannot be empty.")
		return
	}

	tag.UserID = user.ID

	id, err := a.Db.AddUserTag(r.Context(), &tag)

	if err != nil {
		api.ServerErr(w, "Unexpected error adding the tag to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Str("namespace", tag.Namespace).
			Str("name", tag.Name).
			Msg("Unexpected error adding a user's tag to the database")
		return
	}

	tag.ID = id

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(tag)
}
