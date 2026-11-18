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

	if entry.BodyLog.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This body log could not be found. Reload the page and try again.",
		)

		return
	}

	if len(entry.Metrics) == 0 {
		api.WriteValidationProblem(w, []api.FieldProblem{{Pointer: "#/metrics", Detail: "Enter at least one value."}})
		return
	}

	entry.BodyLog.UserID = user.ID

	err = a.Db.UpdateUserBodyLog(r.Context(), &entry)

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
			Int("bodylogID", entry.BodyLog.ID).
			Msg("Unexpected error updating user bodylog")

		return
	}

	api.WriteJSONObj(w, entry)
}
