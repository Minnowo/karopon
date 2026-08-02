package v1

import (
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserBodyLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var entry database.UserBodyLog

	err := json.NewDecoder(r.Body).Decode(&entry)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if entry.BodyLog.ID <= 0 {
		api.BadReq(w, "ID must be > 0")
		return
	}

	entry.BodyLog.UserID = user.ID

	err = a.Db.UpdateUserBodyLog(r.Context(), &entry)

	if errors.Is(err, database.ErrInvalidBodyMetric) {
		api.BadReq(w, "One or more of the given body metrics do not exist for this user")
		return
	}

	if err != nil {

		api.ServerErr(w, "Unexpected error updating the body log")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Int("bodylogID", entry.BodyLog.ID).
			Msg("Unexpected error updating user bodylog")

		return
	}

	api.WriteJSONObj(w, entry)
}
