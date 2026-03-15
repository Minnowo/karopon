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

func (a *APIV1) deleteUserTag(w http.ResponseWriter, r *http.Request) {

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

	err = a.Db.DeleteUserTag(r.Context(), user.ID, tag.Namespace, tag.Name)

	if err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Str("namespace", tag.Namespace).
			Str("name", tag.Name).
			Msg("failed to delete tag")

		api.ServerErr(w, "failed to delete the tag in the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
