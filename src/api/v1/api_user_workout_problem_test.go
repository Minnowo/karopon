// Every workout validation error is answered as a problem the user can act
// on: names as field errors, everything else as a plain problem.

package v1

import (
	"karopon/src/api"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestWriteWorkoutProblem(t *testing.T) {

	cases := []struct {
		err     error
		status  int
		pointer string
	}{
		{ErrExerciseEmptyName, http.StatusUnprocessableEntity, "#/exercise/name"},
		{ErrWorkoutEmptyName, http.StatusUnprocessableEntity, "#/workout/name"},
		{ErrWorkoutLogNoSteps, http.StatusUnprocessableEntity, ""},
		{ErrWorkoutStructureTooLarge, http.StatusUnprocessableEntity, ""},
		{ErrWorkoutStructureInvalidJSON, http.StatusBadRequest, ""},
		{ErrWorkoutNoSets, http.StatusUnprocessableEntity, ""},
		{&WorkoutSetError{Set: 2, Err: ErrWorkoutEmptySet}, http.StatusUnprocessableEntity, ""},
		{ErrWorkoutLogEmptyName, http.StatusBadRequest, ""},
		{ErrWorkoutLogStopsBeforeStart, http.StatusBadRequest, ""},
		{ErrWorkoutLogNegativePause, http.StatusBadRequest, ""},
		{ErrWorkoutLogStepEmptyName, http.StatusBadRequest, ""},
		{ErrWorkoutLogStepInvalidKind, http.StatusBadRequest, ""},
		{ErrWorkoutLogStepInvalidPosition, http.StatusBadRequest, ""},
		{ErrWorkoutLogSegmentStopsBeforeStart, http.StatusBadRequest, ""},
	}

	for _, c := range cases {
		t.Run(c.err.Error(), func(t *testing.T) {

			rr := httptest.NewRecorder()
			writeWorkoutProblem(rr, c.err)

			assert.Equal(t, c.status, rr.Code)
			p := decodeProblem(t, rr)
			assert.NotEmpty(t, p.Detail)
			assert.NotContains(t, p.Detail, c.err.Error(), "internal error text must not reach the user")

			if c.pointer == "" {
				assert.Empty(t, p.Errors)
				return
			}

			assert.Equal(t, api.ProblemTypeValidation, p.Type)
			if assert.Len(t, p.Errors, 1) {
				assert.Equal(t, c.pointer, p.Errors[0].Pointer)
			}
		})
	}
}

func TestWorkoutEmptySetProblemNamesTheSet(t *testing.T) {

	rr := httptest.NewRecorder()
	writeWorkoutProblem(rr, &WorkoutSetError{Set: 2, Err: ErrWorkoutEmptySet})

	assert.Contains(t, decodeProblem(t, rr).Detail, "Set 2")
}
