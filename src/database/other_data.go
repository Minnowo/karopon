package database

type UserEventLogWithFoodLog struct {
	Eventlog     TblUserEventLog  `json:"eventlog"`
	Foodlogs     []TblUserFoodLog `json:"foodlogs"`
	TotalProtein float32          `json:"total_protein"`
	TotalCarb    float32          `json:"total_carb"`
	TotalFibre   float32          `json:"total_fibre"`
	TotalFat     float32          `json:"total_fat"`
}
