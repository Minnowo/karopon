// Validation shared by creating and updating a goal.

package v1

import (
	"karopon/src/api"
	"karopon/src/database"
	"strings"
	"time"
)

// validateGoal trims the goal's name in place and returns one field problem
// per goal field that cannot be saved.
func validateGoal(goal *database.TblUserGoal) []api.FieldProblem {

	var errs []api.FieldProblem

	goal.Name = strings.TrimSpace(goal.Name)

	if len(goal.Name) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/name", Detail: "Enter a name for the goal."})
	}

	if goal.TargetValue < 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/target_value", Detail: "The target must be 0 or more."})
	}

	if !goal.Aggregation().IsValid() {
		errs = append(errs, api.FieldProblem{Pointer: "#/aggregation_type", Detail: "Choose how values are combined."})
	}

	col := goal.TargetColumn()

	switch {
	case !col.IsValid():
		errs = append(errs, api.FieldProblem{Pointer: "#/target_col", Detail: "Choose what the goal tracks."})
	case col == database.TargetColumnBodyMetric && goal.TargetMetric == "":
		errs = append(errs, api.FieldProblem{Pointer: "#/target_metric", Detail: "Choose a body metric."})
	case col == database.TargetColumnTime && goal.TargetMetric == "":
		errs = append(errs, api.FieldProblem{Pointer: "#/target_metric", Detail: "Choose at least one tag."})
	}

	if !goal.Comparison().IsValid() {
		errs = append(
			errs,
			api.FieldProblem{Pointer: "#/value_comparison", Detail: "Choose how the target is compared."},
		)
	}

	if _, _, err := goal.TimeRange(time.Now(), 0); err != nil {
		errs = append(errs, api.FieldProblem{Pointer: "#/time_expr", Detail: "Choose a time range."})
	}

	return errs
}
