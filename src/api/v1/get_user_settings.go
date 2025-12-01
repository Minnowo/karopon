package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) get_usersettings(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var usersettings database.TblUserSettings

	err := a.Db.LoadUserSettings(r.Context(), user.ID, &usersettings)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user settings")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(usersettings)
}
