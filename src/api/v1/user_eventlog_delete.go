package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserEventLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var eventlog database.TblUserEventLog

	err := json.NewDecoder(r.Body).Decode(&eventlog)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if eventlog.ID <= 0 {
		http.Error(w, "eventlog ID should be > 0", http.StatusBadRequest)
		return
	}

	err = a.Db.DeleteUserEventLog(r.Context(), user.ID, eventlog.ID, false)

	if err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Int("eventlog", eventlog.ID).
			Msg("failed to delete user eventlog")
		api.ServerErr(w, "Failed while deleting from the database.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
