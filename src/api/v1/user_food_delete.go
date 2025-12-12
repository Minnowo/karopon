package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserFood(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var food database.TblUserFood

	err := json.NewDecoder(r.Body).Decode(&food)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if food.ID <= 0 {
		http.Error(w, "food has an invalid ID <= 0", http.StatusBadRequest)
		return
	}

	err = a.Db.DeleteUserFood(r.Context(), user.ID, food.ID)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Int("foodId", food.ID).Msg("failed to delete food")
		api.ServerErr(w, "failed to delete the food in the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}
