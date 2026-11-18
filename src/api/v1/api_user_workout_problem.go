// Answers for the workout validation errors in api_user_workout.go.

package v1

import (
	"errors"
	"karopon/src/api"
	"net/http"
)

// writeWorkoutProblem answers err, one of the workout validation errors, as a
// problem. Names the user typed become field errors; the rest come from the
// workout builder or runner, not from a field, and are plain problems.
func writeWorkoutProblem(w http.ResponseWriter, err error) {

	reload := "The workout could not be read. Reload the page and try again."

	switch {
	case errors.Is(err, ErrExerciseEmptyName):
		api.WriteValidationProblem(
			w,
			[]api.FieldProblem{{Pointer: "#/exercise/name", Detail: "Enter a name for the exercise."}},
		)
	case errors.Is(err, ErrWorkoutEmptyName):
		api.WriteValidationProblem(
			w,
			[]api.FieldProblem{{Pointer: "#/workout/name", Detail: "Enter a name for the workout."}},
		)
	case errors.Is(err, ErrWorkoutLogNoSteps):
		api.WriteStatusProblem(
			w,
			http.StatusUnprocessableEntity,
			"There is nothing to save yet. Finish at least one step first.",
		)
	case errors.Is(err, ErrWorkoutStructureTooLarge):
		api.WriteStatusProblem(
			w,
			http.StatusUnprocessableEntity,
			"This workout is too large to save. Remove some steps and try again.",
		)
	case errors.Is(err, ErrWorkoutStructureInvalidJSON):
		api.WriteStatusProblem(w, http.StatusBadRequest, reload)
	default:
		// Log times, steps and segments are produced by the runner, so a failure here means a stale page.
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The workout log could not be read. Reload the page and try again.",
		)
	}
}
