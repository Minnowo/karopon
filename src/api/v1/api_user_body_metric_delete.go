package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserBodyMetric(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var metric database.TblUserBodyMetric

	err := json.NewDecoder(r.Body).Decode(&metric)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if metric.ID <= 0 {
		api.BadReq(w, "ID should be > 0")
		return
	}

	if err := a.Db.DeleteUserBodyMetric(r.Context(), user.ID, metric.ID); err != nil {

		api.ServerErr(w, "Unexpected error deleting the body metric from the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error deleting a user's body metric from the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
