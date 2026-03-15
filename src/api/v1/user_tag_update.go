package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

type updateUserTagRequest struct {
	Namespace    string `json:"namespace"`
	Name         string `json:"name"`
	NewNamespace string `json:"new_namespace"`
	NewName      string `json:"new_name"`
}

func (a *APIV1) updateUserTag(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req updateUserTagRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	req.Namespace = strings.TrimSpace(req.Namespace)
	req.Name = strings.TrimSpace(req.Name)
	req.NewNamespace = strings.TrimSpace(req.NewNamespace)
	req.NewName = strings.TrimSpace(req.NewName)

	if req.Namespace == "" || req.Name == "" {
		api.BadReq(w, "Original namespace and name cannot be empty.")
		return
	}

	if req.NewNamespace == "" || req.NewName == "" {
		api.BadReq(w, "New namespace and name cannot be empty.")
		return
	}
	if req.Namespace == req.NewNamespace && req.Name == req.NewName {
		api.BadReq(w, "The new name and namespace match the old name and namespace.")
		return
	}

	err = a.Db.UpdateUserTag(r.Context(), user.ID, req.Namespace, req.Name, req.NewNamespace, req.NewName)

	if err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Str("namespace", req.Namespace).
			Str("name", req.Name).
			Msg("failed to update tag")
		api.ServerErr(w, "failed to update the tag in the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
