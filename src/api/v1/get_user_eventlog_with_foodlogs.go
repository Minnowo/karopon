package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) get_usereventlog_with_food_logs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var eventlogs []database.UserEventLogWithFoodLog

	err := a.Db.LoadUserEventLogsWithFoodLog(r.Context(), user.ID, &eventlogs)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user event logs and their food")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if len(eventlogs) == 0 {
		w.Write([]byte("[]"))
	} else {
		json.NewEncoder(w).Encode(eventlogs)
	}
}
