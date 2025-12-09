package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) create_userfoodlog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var foodlog database.TblUserFoodLog

	err := json.NewDecoder(r.Body).Decode(&foodlog)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if len(foodlog.Name) == 0 {
		http.Error(w, "food cannot have empty name", http.StatusBadRequest)
		return
	}

	if foodlog.Portion <= 0 {
		http.Error(w, "portion cannot be <= 0", http.StatusBadRequest)
		return
	}

	foodlog.UserID = user.ID

	id, err := a.Db.AddUserFoodLog(r.Context(), &foodlog)

	if err != nil {
		log.Warn().Err(err).Msg("error adding food")
		api.ServerErr(w, "problem adding food")
		return
	}

	foodlog.ID = id

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(foodlog)
}
