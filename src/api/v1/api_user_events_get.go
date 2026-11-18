package v1

import (
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
		api.WriteNoUserProblem(w)
		return
	}

	vars := mux.Vars(r)
	eventIDStr, ok := vars["id"]

	log.Debug().Any("vars", vars).Msg("get user event")

	if !ok {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

	eventID, err := strconv.Atoi(eventIDStr)

	if err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}
	var event database.TblUserEvent

	err = a.Db.LoadUserEvent(r.Context(), user.ID, eventID, &event)

	if err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Int("event_id", eventID).
			Msg("failed to read user event")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your events could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONObj(w, event)
}

func (a *APIV1) getUserEvents(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var events []database.TblUserEvent

	err := a.Db.LoadUserEvents(r.Context(), user.ID, &events)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user events log")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your events could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, events)
}
