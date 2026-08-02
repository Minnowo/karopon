package v1

import (
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) createUserBodyLog(w http.ResponseWriter, r *http.Request) {

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

	entry.BodyLog.UserID = user.ID

	if time.Time(entry.BodyLog.UserTime).IsZero() {
		entry.BodyLog.UserTime = database.TimeMillis(time.Now().UTC())
	}

	id, err := a.Db.AddUserBodyLogs(r.Context(), &entry)

	if errors.Is(err, database.ErrInvalidBodyMetric) {
		api.BadReq(w, "One or more of the given body metrics do not exist for this user")
		return
	}

	if err != nil {

		api.ServerErr(w, "Unexpected error finalizing the event to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error writing the event log to the database when trying to create a user bodylog")

		return
	}

	entry.BodyLog.ID = id

	api.WriteJSONObj(w, entry)
}
