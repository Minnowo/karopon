package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserEventFoodLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var ueflog database.UpdateUserEventLog

	err := json.NewDecoder(r.Body).Decode(&ueflog)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if ueflog.Eventlog.BloodGlucose <= 0 {
		http.Error(w, "blood glucose cannot be <= 0", http.StatusBadRequest)
		return
	}

	if ueflog.Eventlog.ID <= 0 {
		http.Error(w, "eventlog ID should be > 0", http.StatusBadRequest)
		return
	}

	ueflog.Eventlog.UserID = user.ID

	err = a.Db.UpdateUserEventFoodLog(r.Context(), &ueflog)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user event log")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	out := database.UserEventFoodLog{
		Eventlog: ueflog.Eventlog,
		Foodlogs: ueflog.Foodlogs,
	}
	for _, foodlog := range ueflog.Foodlogs {
		out.TotalProtein += foodlog.Protein
		out.TotalCarb += foodlog.Carb
		out.TotalFibre += foodlog.Fibre
		out.TotalFat += foodlog.Fat
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(out)
}
