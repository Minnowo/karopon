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
}

type UserGoalProgress struct {
	CurrentValue  float64        `json:"current_value"`
	TargetValue   float64        `json:"target_value"`
	TimeRemaining DurationMillis `json:"time_remaining"`
}

type TaggedTimespan struct {
	Timespan TblUserTimespan `json:"timespan"`
	Tags     []TblUserTag    `json:"tags"`
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
