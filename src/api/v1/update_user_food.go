package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) update_userfood(w http.ResponseWriter, r *http.Request) {

	user, ok := api.GetSession(r)

	if !ok {
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

	if len(food.Name) == 0 {
		http.Error(w, "food cannot have empty name", http.StatusBadRequest)
		return
	}

	if food.Portion <= 0 {
		http.Error(w, "portion cannot be <= 0", http.StatusBadRequest)
		return
	}

	if food.ID <= 0 {
		http.Error(w, "food ID should be > 0", http.StatusBadRequest)
		return
	}

	food.UserID = user.ID
	food.Scale()

	err = a.Db.UpdateUserFood(r.Context(), &food)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user food log")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.WriteHeader(http.StatusOK)
}
