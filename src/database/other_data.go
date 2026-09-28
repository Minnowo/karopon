package database

import (
	"fmt"
	"strconv"
	"time"
)

type UpdateUserEventLog struct {
	Eventlog TblUserEventLog  `json:"eventlog"`
	Foodlogs []TblUserFoodLog `json:"foodlogs"`
}

type UserEventFoodLog struct {
	Eventlog     TblUserEventLog  `json:"eventlog"`
	Foodlogs     []TblUserFoodLog `json:"foodlogs"`
	TotalProtein float64          `json:"total_protein"`
	TotalCarb    float64          `json:"total_carb"`
	TotalFibre   float64          `json:"total_fibre"`
	TotalFat     float64          `json:"total_fat"`
}

type CreateUserEventLog struct {
	Event TblUserEvent     `json:"event"`
	Foods []TblUserFoodLog `json:"foods"`

	BloodGlucose             float64    `json:"blood_glucose"`
	BloodGlucoseTarget       float64    `json:"blood_glucose_target"`
	InsulinSensitivityFactor float64    `json:"insulin_sensitivity_factor"`
	InsulinToCarbRatio       float64    `json:"insulin_to_carb_ratio"`
	RecommendedInsulinAmount float64    `json:"recommended_insulin_amount"`
	ActualInsulinTaken       float64    `json:"actual_insulin_taken"`
	CreatedTime              TimeMillis `json:"created_time"`
	PhotoIDs                 []int      `json:"photo_ids"`
}

type UserBodyLog struct {
	BodyLog TblUserBodyLog         `json:"bodylog"`
	Metrics []TblUserBodyLogMetric `json:"metrics"`
}

type TaggedTimespan struct {
	Timespan TblUserTimespan `json:"timespan"`
	Tags     []TblUserTag    `json:"tags"`
}

// ActivityWithTag embeds an activity's resolved tag, mirroring TaggedTimespan.
type ActivityWithTag struct {
	Activity TblUserActivity `json:"activity"`
	Tag      TblUserTag      `json:"tag"`
}

// NewUserActivityRequest is the request envelope for creating an activity.
// The tag is referenced by (namespace, name) rather than ID, consistent with
// how tags are addressed everywhere else in the API; the server resolves or
// creates the tag and stores its ID internally.
type NewUserActivityRequest struct {
	Name         string `json:"name"`
	TagNamespace string `json:"tag_namespace"`
	TagName      string `json:"tag_name"`
	Duration     int    `json:"duration"`
	Note         string `json:"note"`
}

// UpdateUserActivityRequest is the request envelope for updating an activity.
type UpdateUserActivityRequest struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	TagNamespace string `json:"tag_namespace"`
	TagName      string `json:"tag_name"`
	Duration     int    `json:"duration"`
	Note         string `json:"note"`
}

// ReminderWithActivities embeds a reminder's linked activities (each with its
// resolved tag). Activities is always a non-nil (possibly empty) slice: an empty
// list means a "plain" reminder with no linked activities.
type ReminderWithActivities struct {
	Reminder   TblUserReminder   `json:"reminder"`
	Activities []ActivityWithTag `json:"activities"`
}

// NewUserReminder is the request envelope for creating a reminder together with
// its initial set of linked activity IDs.
type NewUserReminder struct {
	Reminder    TblUserReminder `json:"reminder"`
	ActivityIDs []int           `json:"activity_ids"`
}

// SetUserReminderActivitiesRequest is the request envelope for replacing the
// set of activities linked to an existing reminder.
type SetUserReminderActivitiesRequest struct {
	ReminderID  int   `json:"reminder_id"`
	ActivityIDs []int `json:"activity_ids"`
}

type BodyLogMetricPoint struct {
	Metric string     `json:"metric" db:"metric"`
	Bucket TimeMillis `json:"bucket" db:"bucket"`
	Value  float64    `json:"value"  db:"value"`
}

type TimespanTagDurationPoint struct {
	Tag           string     `json:"tag"            db:"tag"`
	Bucket        TimeMillis `json:"bucket"         db:"bucket"`
	DurationMilli int64      `json:"duration_milli" db:"duration_milli"`
}

type MacronutrientPoint struct {
	Bucket  TimeMillis `json:"bucket"   db:"bucket"`
	Carb    float64    `json:"carb"     db:"carb"`
	NetCarb float64    `json:"net_carb" db:"net_carb"`
	Fat     float64    `json:"fat"      db:"fat"`
	Fibre   float64    `json:"fibre"    db:"fibre"`
	Protein float64    `json:"protein"  db:"protein"`
	Calorie float64    `json:"calorie"  db:"calorie"`
}

type EventLogPoint struct {
	Bucket                   TimeMillis `json:"bucket"                     db:"bucket"`
	BloodGlucose             float64    `json:"blood_glucose"              db:"blood_glucose"`
	RecommendedInsulinAmount float64    `json:"recommended_insulin_amount" db:"recommended_insulin_amount"`
	ActualInsulinTaken       float64    `json:"actual_insulin_taken"       db:"actual_insulin_taken"`
}

func ValueToString(val any) string {
	switch v := val.(type) {
	case nil:
		return ""

	case []byte:
		return string(v)

	case string:
		return v

	case int:
		return strconv.FormatInt(int64(v), 10)
	case int8:
		return strconv.FormatInt(int64(v), 10)
	case int16:
		return strconv.FormatInt(int64(v), 10)
	case int32:
		return strconv.FormatInt(int64(v), 10)
	case int64:
		return strconv.FormatInt(v, 10)

	case uint:
		return strconv.FormatUint(uint64(v), 10)
	case uint8:
		return strconv.FormatUint(uint64(v), 10)
	case uint16:
		return strconv.FormatUint(uint64(v), 10)
	case uint32:
		return strconv.FormatUint(uint64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)

	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 32)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)

	case bool:
		return strconv.FormatBool(v)

	case TimeMillis:
		return strconv.FormatInt(v.Time().UnixMilli(), 10)

	case time.Time:
		return strconv.FormatInt(v.UnixMilli(), 10)

	default:
		return fmt.Sprint(v)
	}
}

type ExerciseWithTags struct {
	Exercise TblUserExercise `json:"exercise"`
	Tags     []TblUserTag    `json:"tags"`
}

type WorkoutWithTags struct {
	Workout TblUserWorkout `json:"workout"`
	Tags    []TblUserTag   `json:"tags"`
}

type TimeSegment struct {
	StartTime TimeMillis `json:"start_time"`
	StopTime  TimeMillis `json:"stop_time"`
}

type WorkoutLogWithSteps struct {
	WorkoutLog TblUserWorkoutLog       `json:"workoutlog"`
	Steps      []TblUserWorkoutStepLog `json:"steps"`
}

// NewWorkoutLogStep is a step to save with its start/stop segments, in the order they happened.
// The segments set the step's ActualSeconds and are not stored.
// One timespan is created per segment with Tags, none when Tags is empty.
type NewWorkoutLogStep struct {
	Step     TblUserWorkoutStepLog `json:"step"`
	Segments []TimeSegment         `json:"segments"`
	Tags     []TblUserTag          `json:"tags"`
}

type NewWorkoutLog struct {
	WorkoutLog TblUserWorkoutLog   `json:"workoutlog"`
	Steps      []NewWorkoutLogStep `json:"steps"`
}
