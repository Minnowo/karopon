package database

type UpdateUserEventLog struct {
	Eventlog TblUserEventLog  `json:"eventlog"`
	Foodlogs []TblUserFoodLog `json:"foodlogs"`
}

type UserEventFoodLog struct {
	Eventlog     TblUserEventLog  `json:"eventlog"`
	Foodlogs     []TblUserFoodLog `json:"foodlogs"`
	TotalProtein float32          `json:"total_protein"`
	TotalCarb    float32          `json:"total_carb"`
	TotalFibre   float32          `json:"total_fibre"`
	TotalFat     float32          `json:"total_fat"`
}

type CreateUserEventLog struct {
	Event TblUserEvent     `json:"event"`
	Foods []TblUserFoodLog `json:"foods"`

	BloodGlucose             float32    `json:"blood_glucose"`
	BloodGlucoseTarget       float32    `json:"blood_glucose_target"`
	InsulinSensitivityFactor float32    `json:"insulin_sensitivity_factor"`
	InsulinToCarbRatio       float32    `json:"insulin_to_carb_ratio"`
	RecommendedInsulinAmount float32    `json:"recommended_insulin_amount"`
	ActualInsulinTaken       float32    `json:"actual_insulin_taken"`
	CreatedTime              UnixMillis `json:"created_time"`
}
