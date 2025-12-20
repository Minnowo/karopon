package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserBodyLogs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var eventlog []database.TblUserBodyLog

	err := a.Db.LoadUserBodyLogs(r.Context(), user.ID, &eventlog)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user body log")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if len(eventlog) == 0 {
		w.Write([]byte("[]"))
	} else {
		json.NewEncoder(w).Encode(eventlog)
	}
}
