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
		api.WriteNoUserProblem(w)
		return
	}

	var eventlog database.TblUserEventLog

	err := json.NewDecoder(r.Body).Decode(&eventlog)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if eventlog.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This event could not be found. Reload the page and try again.",
		)

		return
	}

	err = a.Db.DeleteUserEventLog(r.Context(), user.ID, eventlog.ID)

	if err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Int("eventlog", eventlog.ID).
			Msg("failed to delete user eventlog")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The event could not be deleted. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
