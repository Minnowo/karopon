package v1

import (
	"encoding/json"
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
		api.BadReq(w, "no user session available")
		return
	}

	var event database.TblUserBodyLog

	err := json.NewDecoder(r.Body).Decode(&event)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if event.WeightKg < 0 {
		api.BadReq(w, "Weight should be >= 0")
		return
	}
	if event.HeightCm < 0 {
		api.BadReq(w, "Height CM should be >= 0")
		return
	}
	if event.BodyFatPercent < 0 {
		api.BadReq(w, "Body Fat Percent should be >= 0")
		return
	}
	if event.BMI < 0 {
		api.BadReq(w, "BMI should be >= 0")
		return
	}
	if event.BPSystolic < 0 {
		api.BadReq(w, "BP Systolic should be >= 0")
		return
	}
	if event.BPDiastolic < 0 {
		api.BadReq(w, "BP Diastolic should be >= 0")
		return
	}
	if event.HeartRateBPM < 0 {
		api.BadReq(w, "BMP should be >= 0")
		return
	}
	if event.StepsCount < 0 {
		api.BadReq(w, "Steps should be >= 0")
		return
	}

	event.UserID = user.ID

	if event.UserTime.Time().IsZero() {
		event.UserTime = database.UnixMillis(time.Now().UTC())
	}

	id, err := a.Db.AddUserBodyLogs(r.Context(), &event)
	if err != nil {
		api.ServerErr(w, "Unexpected error finalizing the event to the database")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error writing the event log to the database when trying to create a user bodylog")
		return
	}

	event.ID = id

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(event)
}
