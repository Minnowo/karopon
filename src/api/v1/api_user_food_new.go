package v1

import (
	"encoding/json"
	"errors"
	"fmt"
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
		api.WriteStatusProblem(w, http.StatusUnauthorized, "Log in again to continue.")
		return
	}

	var food database.TblUserFood

	err := json.NewDecoder(r.Body).Decode(&food)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteStatusProblem(w, http.StatusBadRequest, "The food could not be read. Reload the page and try again.")

		return
	}

	food.Name = strings.TrimSpace(food.Name)
	food.Unit = strings.TrimSpace(food.Unit)

	var errs []api.FieldProblem

	if len(food.Name) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/name", Detail: "Enter a name for the food."})
	}

	if len(food.Unit) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/unit", Detail: "Enter a unit, such as g or cups."})
	}

	if food.Portion <= 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/portion", Detail: "Portion must be more than 0."})
	}

	if len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	food.ID = -1
	food.UserID = user.ID
	food.Scale() // important!

	newID, err := a.Db.AddUserFood(r.Context(), &food)

	if errors.Is(err, database.ErrAlreadyExists) {
		api.WriteAlreadyExistsProblem(w, api.FieldProblem{
			Pointer: "#/name",
			Detail: fmt.Sprintf(
				"You already have %s measured in %s. Change the name or the unit.",
				food.Name,
				food.Unit,
			),
		})

		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new food")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The food could not be saved. Try again.")

		return
	}

	food.ID = newID

	api.WriteJSONObj(w, food)
}
