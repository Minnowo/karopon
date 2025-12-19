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

func (a *APIV1) addUserFood(w http.ResponseWriter, r *http.Request) {

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

	food.Name = strings.TrimSpace(food.Name)
	food.Unit = strings.TrimSpace(food.Unit)

	if len(food.Name) == 0 {
		http.Error(w, "food cannot have empty name", http.StatusBadRequest)
		return
	}

	if len(food.Unit) == 0 {
		http.Error(w, "food cannot have empty unit", http.StatusBadRequest)
		return
	}

	if food.Portion <= 0 {
		http.Error(w, "portion cannot be <= 0", http.StatusBadRequest)
		return
	}

	food.ID = -1
	food.UserID = user.ID
	food.Scale() // important!

	newId, err := a.Db.AddUserFood(r.Context(), &food)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new food")
		api.ServerErr(w, "failed to create the food in the database")
		return
	}

	food.ID = newId

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(food)
}
