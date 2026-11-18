// Validation shared by creating and updating an event log.

package v1

import (
	"fmt"
	"karopon/src/api"
	"karopon/src/database"
	"net/http"
	"strings"
)

// validateFoodLogRows trims each food row's name and unit in place and
// returns one field problem per row that cannot be saved. prefix is the JSON
// Pointer of the rows array in the request, such as "#/foods"; problems point
// at "<prefix>/<index>/<field>".
func validateFoodLogRows(foods []database.TblUserFoodLog, prefix string) []api.FieldProblem {

	var errs []api.FieldProblem

	for i := range foods {

		foods[i].Name = strings.TrimSpace(foods[i].Name)
		foods[i].Unit = strings.TrimSpace(foods[i].Unit)

		if len(foods[i].Name) == 0 {
			errs = append(errs, api.FieldProblem{
				Pointer: fmt.Sprintf("%s/%d/name", prefix, i),
				Detail:  "Enter a food name.",
			})
		}

		// A zero portion of a known food is allowed; a new food with a zero
		// portion is rejected by the database as a FoodLogRowError.
		if foods[i].Portion < 0 {
			errs = append(errs, api.FieldProblem{
				Pointer: fmt.Sprintf("%s/%d/portion", prefix, i),
				Detail:  "Amount cannot be negative.",
			})
		}
	}

	return errs
}

// writeFoodLogRowProblem answers a database FoodLogRowError as a validation
// problem on that row's portion. prefix is as for validateFoodLogRows.
func writeFoodLogRowProblem(w http.ResponseWriter, rowErr *database.FoodLogRowError, prefix string) {
	api.WriteValidationProblem(w, []api.FieldProblem{{
		Pointer: fmt.Sprintf("%s/%d/portion", prefix, rowErr.Index),
		Detail:  "Enter an amount for this new food.",
	}})
}
