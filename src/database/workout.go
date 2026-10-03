package database

import (
	"slices"
	"strings"
	"time"
)

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

// GroupWorkoutTimespans makes one timespan per distinct tag set, in the order the tag sets first ran.
// Each starts at the group's first segment and lasts the total time of the group's segments.
func GroupWorkoutTimespans(userID int, steps []NewWorkoutLogStep) []TaggedTimespan {

	var out []TaggedTimespan

	totals := []time.Duration{}
	index := map[string]int{}

	for _, s := range steps {

		if len(s.Tags) == 0 || len(s.Segments) == 0 {
			continue
		}

		keys := make([]string, len(s.Tags))

		for i, t := range s.Tags {
			keys[i] = t.Namespace + ":" + t.Name
		}

		slices.Sort(keys)
		key := strings.Join(slices.Compact(keys), "\x00")

		i, ok := index[key]

		if !ok {
			i = len(out)
			index[key] = i
			out = append(out, TaggedTimespan{
				Timespan: TblUserTimespan{UserID: userID, StartTime: s.Segments[0].StartTime},
				Tags:     s.Tags,
			})
			totals = append(totals, 0)
		}

		for _, seg := range s.Segments {
			totals[i] += seg.StopTime.Time().Sub(seg.StartTime.Time())
		}
	}

	for i := range out {
		out[i].Timespan.StopTime = TimeMillis(out[i].Timespan.StartTime.Time().Add(totals[i]))
	}

	return out
}
