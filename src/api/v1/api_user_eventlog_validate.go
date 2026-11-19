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
		} else if len(foods[i].Unit) == 0 {
			// The unit comes from the saved food the row was picked from, so
			// an empty one means the row names no saved food.
			errs = append(errs, api.FieldProblem{
				Pointer: fmt.Sprintf("%s/%d/unit", prefix, i),
				Detail:  foodNotSavedDetail,
			})
		}

		// A zero portion is allowed: the row is kept with no nutrients.
		if foods[i].Portion < 0 {
			errs = append(errs, api.FieldProblem{
				Pointer: fmt.Sprintf("%s/%d/portion", prefix, i),
				Detail:  "Amount cannot be negative.",
			})
		}
	}

	return errs
}

// foodNotSavedDetail is the message for a food row that names no saved food:
// an event only uses foods made on the foods page.
const foodNotSavedDetail = "Pick a saved food from the list. To use a new food, add it on the Foods page first."

// writeFoodLogRowProblem answers a database FoodLogRowError (the row names no
// saved food) as a validation problem on that row's name. prefix is as for
// validateFoodLogRows.
func writeFoodLogRowProblem(w http.ResponseWriter, rowErr *database.FoodLogRowError, prefix string) {
	api.WriteValidationProblem(w, []api.FieldProblem{{
		Pointer: fmt.Sprintf("%s/%d/name", prefix, rowErr.Index),
		Detail:  foodNotSavedDetail,
	}})
}
