package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserBodyLog(w http.ResponseWriter, r *http.Request) {

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

	if event.ID <= 0 {
		api.BadReq(w, "ID must be > 0")
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
		api.BadReq(w, "BPM should be >= 0")
		return
	}
	if event.StepsCount < 0 {
		api.BadReq(w, "Steps should be >= 0")
		return
	}

	event.UserID = user.ID

	if err := a.Db.UpdateUserBodyLog(r.Context(), &event); err != nil {

		api.ServerErr(w, "Unexpected error updating the body log")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Int("bodylogID", event.ID).
			Msg("Unexpected error updating user bodylog")

		return
	}

	api.WriteJSONObj(w, event)
}
