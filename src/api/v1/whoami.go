package v1

import (
	"encoding/json"
	"karopon/src/api"
	"net/http"
)

func (a *APIV1) whoami(w http.ResponseWriter, r *http.Request) {

	user, ok := api.GetSession(r)

	if !ok {
		api.Unauthorized(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}
