package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"net/http"
)

func (a *APIV1) getUser(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}
