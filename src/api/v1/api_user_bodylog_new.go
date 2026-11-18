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
		api.WriteNoUserProblem(w)
		return
	}

	var entry database.UserBodyLog

	err := json.NewDecoder(r.Body).Decode(&entry)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if len(entry.Metrics) == 0 {
		api.WriteValidationProblem(w, []api.FieldProblem{{Pointer: "#/metrics", Detail: "Enter at least one value."}})
		return
	}

	entry.BodyLog.UserID = user.ID

	if time.Time(entry.BodyLog.UserTime).IsZero() {
		entry.BodyLog.UserTime = database.TimeMillis(time.Now().UTC())
	}

	id, err := a.Db.AddUserBodyLogs(r.Context(), &entry)

	if errors.Is(err, database.ErrInvalidBodyMetric) {
		api.WriteStatusProblem(
			w,
			http.StatusConflict,
			"One of these body metrics no longer exists. Reload the page and try again.",
		)

		return
	}

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The body log could not be saved. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error writing the event log to the database when trying to create a user bodylog")

		return
	}

	entry.BodyLog.ID = id

	api.WriteJSONObj(w, entry)
}
