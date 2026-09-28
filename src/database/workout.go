package database

import "time"

// GroupWorkoutLogSteps puts each step under its log, keeping the order of both.
func GroupWorkoutLogSteps(logs []TblUserWorkoutLog, steps []TblUserWorkoutStepLog) []WorkoutLogWithSteps {

	out := make([]WorkoutLogWithSteps, len(logs))
	index := make(map[int]int, len(logs))

	for i, l := range logs {
		out[i] = WorkoutLogWithSteps{WorkoutLog: l, Steps: []TblUserWorkoutStepLog{}}
		index[l.ID] = i
	}

	for _, s := range steps {
		if i, ok := index[s.WorkoutLogID]; ok {
			out[i].Steps = append(out[i].Steps, s)
		}
	}

	return out
}

// SegmentsSeconds is the total length of the segments, rounded to the nearest second.
func SegmentsSeconds(segments []TimeSegment) int {

	var total time.Duration

	for _, s := range segments {
		total += s.StopTime.Time().Sub(s.StartTime.Time())
	}

	return int(total.Round(time.Second) / time.Second)
}
