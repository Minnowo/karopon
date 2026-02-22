package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"time"
)

type ServerTime struct {
	Time database.TimeMillis `json:"time"`
}

func (a *APIV1) getServerTime(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	api.WriteJSONObj(w, ServerTime{
		Time: database.TimeMillis(time.Now()),
	})
}
