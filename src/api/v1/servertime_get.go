package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"time"
)

type ServerTime struct {
	Time database.UnixMillis `json:"time"`
}

func (a *APIV1) getServerTime(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(ServerTime{
		Time: database.UnixMillis(time.Now()),
	})
}
