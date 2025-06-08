package database

import (
	"database/sql"
	"time"
)

type TblConfig struct {
	Version Version `db:"version" json:"version"`
}

type TblEvent struct {
	ID   int    `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
}

type TblUser struct {
	ID       int       `db:"id" json:"id"`
	Name     string    `db:"name" json:"name"`
	Password []byte    `db:"password" json:"-"`
	Created  time.Time `db:"created" json:"created"`
}

type TblUserEvent struct {
	ID                       int       `db:"id" json:"id"`
	UserID                   int       `db:"user_id" json:"user_id"`
	EventID                  int       `db:"event_id" json:"event_id"`
	Created                  time.Time `db:"created" json:"created"`
	UserTime                 time.Time `db:"user_time" json:"user_time"`
	Event                    string    `db:"event" json:"event"`
	NetCarbs                 float32   `db:"net_carbs" json:"net_carbs"`
	BloodGlucose             float32   `db:"blood_glucose" json:"blood_glucose"`
	BloodGlucoseTarget       float32   `db:"blood_glucose_target" json:"blood_glucose_target"`
	InsulinSensitivityFactor float32   `db:"insulin_sensitivity_factor" json:"insulin_sensitivity_factor"`
	InsulinToCarbRatio       float32   `db:"insulin_to_carb_ratio" json:"insulin_to_carb_ratio"`
	RecommendedInsulinAmount float32   `db:"recommended_insulin_amount" json:"recommended_insulin_amount"`
	ActualInsulinTaken       float32   `db:"actual_insulin_taken" json:"actual_insulin_taken"`
}

type TblUserFood struct {
	ID      int     `db:"id" json:"id"`
	UserID  int     `db:"user_id" json:"user_id"`
	Name    string  `db:"name" json:"name"`
	Unit    string  `db:"unit" json:"unit"`
	Portion float32 `db:"portion" json:"portion"`
	Protein float32 `db:"protein" json:"protein"`
	Carb    float32 `db:"carb" json:"carb"`
	Fibre   float32 `db:"fibre" json:"fibre"`
	Fat     float32 `db:"fat" json:"fat"`
}

type TblUserFoodLog struct {
	ID       int       `db:"id" json:"id"`
	UserID   int       `db:"user_id" json:"user_id"`
	FoodID   int       `db:"food_id" json:"food_id"`
	Created  time.Time `db:"created" json:"created"`
	UserTime time.Time `db:"user_time" json:"user_time"`
	Name     string    `db:"name" json:"name"`

	EventID sql.NullInt64 `db:"event_id" json:"event_id"`
	Event   string        `db:"event" json:"event"`

	Unit string `db:"unit" json:"unit"`

	Portion float32 `db:"portion" json:"portion"`
	Protein float32 `db:"protein" json:"protein"`
	Carb    float32 `db:"carb" json:"carb"`
	Fibre   float32 `db:"fibre" json:"fibre"`
	Fat     float32 `db:"fat" json:"fat"`
}
