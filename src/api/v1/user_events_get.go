package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserEvent(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	vars := mux.Vars(r)
	eventIDStr, ok := vars["id"]

	log.Debug().Any("vars", vars).Msg("get user event")

	if !ok {
		api.BadReq(w, "no event id given")
		return
	}

	eventID, err := strconv.Atoi(eventIDStr)

	if err != nil {
		api.BadReq(w, "event id is not a valid number")
		return
	}
	var event database.TblUserEvent

	err = a.Db.LoadUserEvent(r.Context(), user.ID, eventID, &event)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Int("event_id", eventID).Msg("failed to read user event")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(event)
}

func (a *APIV1) getUserEvents(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var events []database.TblUserEvent

	err := a.Db.LoadUserEvents(r.Context(), user.ID, &events)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user events log")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if len(events) == 0 {
		w.Write([]byte("[]"))
	} else {
		json.NewEncoder(w).Encode(events)
	}
}
