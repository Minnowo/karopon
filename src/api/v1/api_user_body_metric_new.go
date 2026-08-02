package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) createUserBodyMetric(w http.ResponseWriter, r *http.Request) {

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

	metric.Name = strings.TrimSpace(metric.Name)
	metric.Unit = strings.TrimSpace(metric.Unit)

	if metric.Name == "" {
		api.BadReq(w, "Name cannot be empty")
		return
	}

	metric.UserID = user.ID

	id, err := a.Db.AddUserBodyMetric(r.Context(), &metric)

	if err != nil {

		api.ServerErr(w, "Unexpected error adding the body metric to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error adding a user's body metric to the database")

		return
	}

	metric.ID = id

	api.WriteJSONObj(w, metric)
}
