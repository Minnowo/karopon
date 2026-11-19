// Tests for the workout checks: a workout needs a name and at least one set,
// and every set needs at least one step.

package v1

import (
	"errors"
	"karopon/src/database"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func workoutWith(structure string) *database.WorkoutWithTags {
	return &database.WorkoutWithTags{Workout: database.TblUserWorkout{Name: "Leg day", Structure: structure}}
}

func TestValidateWorkoutNeedsASetWithAStep(t *testing.T) {

	step := `{"exercise_id":1,"kind":"timed","seconds":20}`

	cases := []struct {
		name      string
		structure string
		want      error
	}{
		{"no structure", ``, ErrWorkoutNoSets},
		{"no sets", `{"v":1,"sets":[]}`, ErrWorkoutNoSets},
		{"sets missing", `{"v":1}`, ErrWorkoutNoSets},
		{"one empty set", `{"v":1,"sets":[{"steps":[]}]}`, ErrWorkoutEmptySet},
		{"not an object", `[]`, ErrWorkoutStructureInvalidJSON},
		{"one set with a step", `{"v":1,"sets":[{"steps":[` + step + `]}]}`, nil},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validateWorkout(workoutWith(c.structure))
			if c.want == nil {
				assert.NoError(t, err)
				return
			}
			assert.ErrorIs(t, err, c.want)
		})
	}
}

func TestValidateWorkoutNamesTheEmptySet(t *testing.T) {

	step := `{"exercise_id":1,"kind":"timed","seconds":20}`
	err := validateWorkout(workoutWith(`{"v":1,"sets":[{"steps":[` + step + `]},{"steps":[]}]}`))

	var setErr *WorkoutSetError
	require.True(t, errors.As(err, &setErr), "got %v", err)
	assert.Equal(t, 2, setErr.Set)
}
