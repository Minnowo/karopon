package v1

import (
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

	api.WriteJSONObj(w, user)
}
