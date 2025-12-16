package database

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
	CreatedTime              UnixMillis `json:"created_time"`
}
