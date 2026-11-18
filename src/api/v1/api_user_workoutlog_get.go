package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strconv"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserWorkoutLogs(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	// No n or a negative n loads every log.
	n := -1

	if limit := r.URL.Query().Get("n"); limit != "" {

		var err error

		if n, err = strconv.Atoi(limit); err != nil {
			api.WriteStatusProblem(
				w,
				http.StatusBadRequest,
				"The request could not be read. Reload the page and try again.",
			)

			return
		}
	}

	var out []database.WorkoutLogWithSteps

	if err := a.Db.LoadUserWorkoutLogsN(r.Context(), user.ID, n, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user workout logs")
		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your workout history could not be loaded. Reload the page to try again.",
		)

		return
	}

	api.WriteJSONArr(w, out)
}
