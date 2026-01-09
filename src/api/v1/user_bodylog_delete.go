package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserBodyLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var event database.TblUserBodyLog

	err := json.NewDecoder(r.Body).Decode(&event)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if event.ID <= 0 {
		api.BadReq(w, "Bodylog ID should be > 0")
		return
	}

	if err := a.Db.DeleteUserBodyLog(r.Context(), user.ID, event.ID); err != nil {
		api.ServerErr(w, "Unexpected error deleting the bodylog from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error deleting a user's bodylog from the database")
		return
	}

	w.WriteHeader(http.StatusOK)
}
