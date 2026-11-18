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
		api.WriteNoUserProblem(w)
		return
	}

	var food database.TblUserFood

	err := json.NewDecoder(r.Body).Decode(&food)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if food.ID <= 0 {
		api.WriteStatusProblem(w, http.StatusBadRequest, "This food could not be found. Reload the page and try again.")
		return
	}

	err = a.Db.DeleteUserFood(r.Context(), user.ID, food.ID)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Int("foodID", food.ID).Msg("failed to delete food")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The food could not be deleted. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
