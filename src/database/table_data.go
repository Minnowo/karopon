package database

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type UnixMillis time.Time

func (t UnixMillis) MarshalJSON() ([]byte, error) {
	ms := time.Time(t).UnixNano() / int64(time.Millisecond)
	return fmt.Appendf(nil, "%d", ms), nil
}

func (t *UnixMillis) UnmarshalJSON(b []byte) error {
	var ms int64
	if err := json.Unmarshal(b, &ms); err != nil {
		return err
	}
	*t = UnixMillis(time.Unix(0, ms*int64(time.Millisecond)))
	return nil
}

func (t UnixMillis) Value() (driver.Value, error) {
	return time.Time(t), nil
}

func (t *UnixMillis) Scan(value any) error {
	switch v := value.(type) {
	case time.Time:
		*t = UnixMillis(v)
		return nil
	default:
		return fmt.Errorf("cannot scan %T into UnixMillis", value)
	}
}

type TblConfig struct {
	Version Version `db:"version" json:"version"`
}

type TblUserEvent struct {
	ID     int    `db:"id" json:"id"`
	UserID int    `db:"user_id" json:"user_id"`
	Name   string `db:"name" json:"name"`
}

type TblUser struct {
	ID       int        `db:"id" json:"id"`
	Name     string     `db:"name" json:"name"`
	Password []byte     `db:"password" json:"-"`
	Created  UnixMillis `db:"created" json:"created"`
}

type TblUserEventLog struct {
	ID                       int        `db:"id" json:"id"`
	UserID                   int        `db:"user_id" json:"user_id"`
	EventID                  int        `db:"event_id" json:"event_id"`
	Created                  UnixMillis `db:"created" json:"created"`
	UserTime                 UnixMillis `db:"user_time" json:"user_time"`
	Event                    string     `db:"event" json:"event"`
	NetCarbs                 float32    `db:"net_carbs" json:"net_carbs"`
	BloodGlucose             float32    `db:"blood_glucose" json:"blood_glucose"`
	BloodGlucoseTarget       float32    `db:"blood_glucose_target" json:"blood_glucose_target"`
	InsulinSensitivityFactor float32    `db:"insulin_sensitivity_factor" json:"insulin_sensitivity_factor"`
	InsulinToCarbRatio       float32    `db:"insulin_to_carb_ratio" json:"insulin_to_carb_ratio"`
	RecommendedInsulinAmount float32    `db:"recommended_insulin_amount" json:"recommended_insulin_amount"`
	ActualInsulinTaken       float32    `db:"actual_insulin_taken" json:"actual_insulin_taken"`
}

type TblUserFood struct {
	ID      int     `db:"id" json:"id"`
	UserID  int     `db:"user_id" json:"-"`
	Name    string  `db:"name" json:"name"`
	Unit    string  `db:"unit" json:"unit"`
	Portion float32 `db:"portion" json:"portion"`
	Protein float32 `db:"protein" json:"protein"`
	Carb    float32 `db:"carb" json:"carb"`
	Fibre   float32 `db:"fibre" json:"fibre"`
	Fat     float32 `db:"fat" json:"fat"`
}

func (f *TblUserFood) Scale() {
	if f.Portion != 1 {
		f.Carb = float32(f.Carb) / f.Portion
		f.Fat = float32(f.Fat) / f.Portion
		f.Fibre = float32(f.Fibre) / f.Portion
		f.Protein = float32(f.Protein) / f.Portion
		f.Portion = 1
	}
}

type TblUserFoodLog struct {
	ID       int        `db:"id" json:"id"`
	UserID   int        `db:"user_id" json:"user_id"`
	FoodID   *int       `db:"food_id" json:"food_id"`
	Created  UnixMillis `db:"created" json:"created"`
	UserTime UnixMillis `db:"user_time" json:"user_time"`
	Name     string     `db:"name" json:"name"`

	EventLogID *int   `db:"eventlog_id" json:"eventlog_id"`
	EventID    *int   `db:"event_id" json:"event_id"`
	Event      string `db:"event" json:"event"`

	Unit string `db:"unit" json:"unit"`

	Portion float32 `db:"portion" json:"portion"`
	Protein float32 `db:"protein" json:"protein"`
	Carb    float32 `db:"carb" json:"carb"`
	Fibre   float32 `db:"fibre" json:"fibre"`
	Fat     float32 `db:"fat" json:"fat"`
}

type TblUserSettings struct {
	ID                       int     `db:"id" json:"id"`
	UserID                   int     `db:"user_id" json:"user_id"`
	DarkMode                 bool    `db:"dark_mode" json:"dark_mode"`
	ShowDiabetes             bool    `db:"show_diabetes" json:"show_diabetes"`
	CaloricCalcMethod        string  `db:"caloric_calc_method" json:"caloric_calc_method"`
	InsulinSensitivityFactor float32 `db:"insulin_sensitivity_factor" json:"insulin_sensitivity_factor"`
}
