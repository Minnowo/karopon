package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserTagColor(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req struct {
		Namespace []string `json:"namespace"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.BadReq(w, "invalid request body")
		return
	}

	if len(req.Namespace) == 0 {
		api.BadReq(w, "expected array of namespaces to delete")
		return
	}

	for i := range len(req.Namespace) {

		if req.Namespace[i] == "" {
			api.BadReq(w, "namespace must not be empty")
			return
		}
	}

	if err := a.Db.DeleteUserTagColors(r.Context(), user.ID, req.Namespace); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to delete user tag color")
		api.ServerErr(w, "failed while writing to the database")
		return
	}

	w.WriteHeader(http.StatusOK)
}
