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
		api.BadReq(w, "no user session available")
		return
	}

	// No n or a negative n loads every log.
	n := -1

	if limit := r.URL.Query().Get("n"); limit != "" {

		var err error

		if n, err = strconv.Atoi(limit); err != nil {
			http.Error(w, "query parameter 'n' could not be parsed as an integer", http.StatusBadRequest)
			return
		}
	}

	var out []database.WorkoutLogWithSteps

	if err := a.Db.LoadUserWorkoutLogsN(r.Context(), user.ID, n, &out); err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user workout logs")
		api.ServerErr(w, "failed while reading from the database")

		return
	}

	api.WriteJSONArr(w, out)
}
