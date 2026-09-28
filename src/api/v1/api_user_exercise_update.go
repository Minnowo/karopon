package v1

import (
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserExercise(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req database.ExerciseWithTags

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	if req.Exercise.ID <= 0 {
		http.Error(w, "exercise ID should be > 0", http.StatusBadRequest)
		return
	}

	if err := validateExercise(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req.Exercise.UserID = user.ID

	err := a.Db.UpdateUserExercise(r.Context(), &req.Exercise, req.Tags)

	if errors.Is(err, database.ErrUserDoesNotHaveThisID) {
		http.Error(w, "exercise does not exist", http.StatusBadRequest)
		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update exercise")
		api.ServerErr(w, "failed while writing to the database")

		return
	}

	w.WriteHeader(http.StatusOK)
}
