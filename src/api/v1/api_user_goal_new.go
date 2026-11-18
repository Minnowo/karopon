package v1

import (
	"encoding/json"
	"errors"
	"fmt"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) newUserGoal(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var goal database.TblUserGoal

	err := json.NewDecoder(r.Body).Decode(&goal)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if errs := validateGoal(&goal); len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	goal.UserID = user.ID

	id, err := a.Db.AddUserGoal(r.Context(), &goal)

	if errors.Is(err, database.ErrAlreadyExists) {
		api.WriteAlreadyExistsProblem(w, api.FieldProblem{
			Pointer: "#/name",
			Detail:  fmt.Sprintf("You already have a goal called %s. Use a different name.", goal.Name),
		})

		return
	}

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The goal could not be saved. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error adding a user's goal to the database")

		return
	}

	goal.ID = id

	api.WriteJSONObj(w, goal)
}
