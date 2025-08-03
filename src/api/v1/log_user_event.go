package v1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/database"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

type CreateUserEventLog struct {
	Event database.TblUserEvent     `json:"event"`
	Foods []database.TblUserFoodLog `json:"foods"`
}

func (a *APIV1) create_userevent(w http.ResponseWriter, r *http.Request) {

	user, ok := api.GetSession(r)

	if !ok {
		api.BadReq(w, "no user session available")
		return
	}

	var event CreateUserEventLog

	err := json.NewDecoder(r.Body).Decode(&event)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if len(event.Event.Name) == 0 {
		http.Error(w, "event cannot have empty name", http.StatusBadRequest)
		return
	}

	event.Event.UserID = user.ID

	if err := a.Db.LoadUserEventByName(r.Context(), user.ID, event.Event.Name, &event.Event); err != nil {

		if !errors.Is(err, sql.ErrNoRows) {
			api.ServerErr(w, "Unexpected error reading from the database")
			log.Error().
				Err(err).
				Str("event", event.Event.Name).
				Int("userid", user.ID).
				Msg("Unexpected error reading the event from the database when trying to create a user event")
			return
		}

		id, err := a.Db.AddUserEvent(r.Context(), &event.Event)
		if err != nil {
			api.ServerErr(w, "Unexpected error adding the event to the database")
			log.Error().
				Err(err).
				Str("event", event.Event.Name).
				Int("userid", user.ID).
				Msg("Unexpected error writing the event from the database when trying to create a user event")
			return
		}

		event.Event.ID = id
	}

	var userEventLog database.TblUserEventLog
	userEventLog.UserID = user.ID
	userEventLog.EventID = event.Event.ID
	userEventLog.Event = event.Event.Name
	userEventLog.UserTime = database.UnixMillis(time.Now().UTC())

	id, err := a.Db.AddUserEventLogWith(r.Context(), &userEventLog, event.Foods)
	if err != nil {
		api.ServerErr(w, "Unexpected error finalizing the event to the database")
		log.Error().
			Err(err).
			Str("event", event.Event.Name).
			Int("userid", user.ID).
			Msg("Unexpected error writing the event log to the database when trying to create a user event")
		return
	}

	userEventLog.ID = id

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userEventLog)
}
