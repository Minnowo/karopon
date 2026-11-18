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
		api.WriteNoUserProblem(w)
		return
	}

	var tag database.TblUserTag

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)
		return
	}

	tag.Namespace = strings.TrimSpace(tag.Namespace)
	tag.Name = strings.TrimSpace(tag.Name)

	if tag.Namespace == "" {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

	if tag.Name == "" {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

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

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The tag could not be deleted. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
