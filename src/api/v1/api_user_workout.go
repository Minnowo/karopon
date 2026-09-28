package v1

import (
	"encoding/json"
	"errors"
	"karopon/src/database"
	"strings"
)

var (
	ErrExerciseEmptyName                 = errors.New("exercise cannot have an empty name")
	ErrWorkoutEmptyName                  = errors.New("workout cannot have an empty name")
	ErrWorkoutStructureTooLarge          = errors.New("workout structure is too large")
	ErrWorkoutStructureInvalidJSON       = errors.New("workout structure must be valid JSON")
	ErrWorkoutLogEmptyName               = errors.New("workout log cannot have an empty name")
	ErrWorkoutLogStopsBeforeStart        = errors.New("workout log stops before it starts")
	ErrWorkoutLogNegativePause           = errors.New("workout log paused time cannot be negative")
	ErrWorkoutLogNoSteps                 = errors.New("workout log must have at least one step")
	ErrWorkoutLogStepEmptyName           = errors.New("workout log step cannot have an empty name")
	ErrWorkoutLogStepInvalidKind         = errors.New("workout log step has an invalid kind")
	ErrWorkoutLogStepInvalidPosition     = errors.New("workout log step set, round, and step must be >= 1")
	ErrWorkoutLogSegmentStopsBeforeStart = errors.New("workout log step segment stops before it starts")
)

// maxWorkoutStructureLen caps the size of a workout's structure blob.
const maxWorkoutStructureLen = 256 * 1024

// cleanTags trims the tags and drops any with an empty namespace or name.
func cleanTags(tags []database.TblUserTag) []database.TblUserTag {

	out := make([]database.TblUserTag, 0, len(tags))

	for _, t := range tags {

		t.Namespace = strings.TrimSpace(t.Namespace)
		t.Name = strings.TrimSpace(t.Name)

		if t.Namespace != "" && t.Name != "" {
			out = append(out, database.TblUserTag{Namespace: t.Namespace, Name: t.Name})
		}
	}

	return out
}

func validateExercise(e *database.ExerciseWithTags) error {

	e.Exercise.Name = strings.TrimSpace(e.Exercise.Name)
	e.Tags = cleanTags(e.Tags)

	if e.Exercise.Name == "" {
		return ErrExerciseEmptyName
	}

	return nil
}

func validateWorkout(w *database.WorkoutWithTags) error {

	w.Workout.Name = strings.TrimSpace(w.Workout.Name)
	w.Tags = cleanTags(w.Tags)

	if w.Workout.Name == "" {
		return ErrWorkoutEmptyName
	}

	if len(w.Workout.Structure) > maxWorkoutStructureLen {
		return ErrWorkoutStructureTooLarge
	}

	if w.Workout.Structure != "" && !json.Valid([]byte(w.Workout.Structure)) {
		return ErrWorkoutStructureInvalidJSON
	}

	return nil
}

func validateNewWorkoutLog(l *database.NewWorkoutLog) error {

	l.WorkoutLog.Name = strings.TrimSpace(l.WorkoutLog.Name)

	if l.WorkoutLog.Name == "" {
		return ErrWorkoutLogEmptyName
	}

	if l.WorkoutLog.StopTime.Time().Before(l.WorkoutLog.StartTime.Time()) {
		return ErrWorkoutLogStopsBeforeStart
	}

	if l.WorkoutLog.PausedMs < 0 {
		return ErrWorkoutLogNegativePause
	}

	if len(l.Steps) == 0 {
		return ErrWorkoutLogNoSteps
	}

	for i := range l.Steps {

		s := &l.Steps[i]
		s.Step.Name = strings.TrimSpace(s.Step.Name)
		s.Tags = cleanTags(s.Tags)

		if s.Step.Name == "" {
			return ErrWorkoutLogStepEmptyName
		}

		if !s.Step.Kind.Valid() {
			return ErrWorkoutLogStepInvalidKind
		}

		if s.Step.SetNumber < 1 || s.Step.Round < 1 || s.Step.Step < 1 {
			return ErrWorkoutLogStepInvalidPosition
		}

		for _, seg := range s.Segments {
			if seg.StopTime.Time().Before(seg.StartTime.Time()) {
				return ErrWorkoutLogSegmentStopsBeforeStart
			}
		}
	}

	return nil
}
