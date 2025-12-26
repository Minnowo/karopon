package database

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type UnixMillis time.Time

func (t UnixMillis) Time() time.Time {
	return time.Time(t).UTC()
}

func (t UnixMillis) MarshalJSON() ([]byte, error) {
	ms := time.Time(t).UTC().UnixNano() / int64(time.Millisecond)
	return fmt.Appendf(nil, "%d", ms), nil
}

func (t *UnixMillis) UnmarshalJSON(b []byte) error {
	var ms int64
	if err := json.Unmarshal(b, &ms); err != nil {
		return err
	}
	if ms == 0 {
		*t = UnixMillis(time.Time{}.UTC())
	} else {
		*t = UnixMillis(time.Unix(0, ms*int64(time.Millisecond)).UTC())
	}
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

	// settings
	DarkMode                 bool    `db:"dark_mode" json:"dark_mode"`
	ShowDiabetes             bool    `db:"show_diabetes" json:"show_diabetes"`
	CaloricCalcMethod        string  `db:"caloric_calc_method" json:"caloric_calc_method"`
	InsulinSensitivityFactor float64 `db:"insulin_sensitivity_factor" json:"insulin_sensitivity_factor"`
	EventHistoryFetchLimit   int     `db:"event_history_fetch_limit" json:"event_history_fetch_limit"`
	TargetBloodSugar         float64 `db:"target_blood_sugar" json:"target_blood_sugar"`
	SessionExpireTimeSeconds int64   `db:"session_expire_time_seconds" json:"session_expire_time_seconds"`
	TimeFormat               string  `db:"time_format" json:"time_format"`
	DateFormat               string  `db:"date_format" json:"date_format"`
}

func (u *TblUser) Copy() *TblUser {

	if u == nil {
		return nil
	}

	var pw []byte
	if u.Password != nil {
		pw = make([]byte, len(u.Password))
		copy(pw, u.Password)
	}

	return &TblUser{
		ID:                       u.ID,
		Name:                     u.Name,
		Password:                 pw,
		Created:                  u.Created,
		DarkMode:                 u.DarkMode,
		ShowDiabetes:             u.ShowDiabetes,
		CaloricCalcMethod:        u.CaloricCalcMethod,
		InsulinSensitivityFactor: u.InsulinSensitivityFactor,
		EventHistoryFetchLimit:   u.EventHistoryFetchLimit,
		TargetBloodSugar:         u.TargetBloodSugar,
		SessionExpireTimeSeconds: u.SessionExpireTimeSeconds,
		TimeFormat:               u.TimeFormat,
		DateFormat:               u.DateFormat,
	}
}

type TblUserEventLog struct {
	ID                       int        `db:"id" json:"id"`
	UserID                   int        `db:"user_id" json:"user_id"`
	EventID                  int        `db:"event_id" json:"event_id"`
	Created                  UnixMillis `db:"created" json:"created"`
	UserTime                 UnixMillis `db:"user_time" json:"user_time"`
	Event                    string     `db:"event" json:"event"`
	NetCarbs                 float64    `db:"net_carbs" json:"net_carbs"`
	BloodGlucose             float64    `db:"blood_glucose" json:"blood_glucose"`
	BloodGlucoseTarget       float64    `db:"blood_glucose_target" json:"blood_glucose_target"`
	InsulinSensitivityFactor float64    `db:"insulin_sensitivity_factor" json:"insulin_sensitivity_factor"`
	InsulinToCarbRatio       float64    `db:"insulin_to_carb_ratio" json:"insulin_to_carb_ratio"`
	RecommendedInsulinAmount float64    `db:"recommended_insulin_amount" json:"recommended_insulin_amount"`
	ActualInsulinTaken       float64    `db:"actual_insulin_taken" json:"actual_insulin_taken"`
}

type TblUserFood struct {
	ID      int     `db:"id" json:"id"`
	UserID  int     `db:"user_id" json:"-"`
	Name    string  `db:"name" json:"name"`
	Unit    string  `db:"unit" json:"unit"`
	Portion float64 `db:"portion" json:"portion"`
	Protein float64 `db:"protein" json:"protein"`
	Carb    float64 `db:"carb" json:"carb"`
	Fibre   float64 `db:"fibre" json:"fibre"`
	Fat     float64 `db:"fat" json:"fat"`
}

func (f *TblUserFood) Scale() {
	if f.Portion != 1 {
		f.Carb = float64(f.Carb) / f.Portion
		f.Fat = float64(f.Fat) / f.Portion
		f.Fibre = float64(f.Fibre) / f.Portion
		f.Protein = float64(f.Protein) / f.Portion
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

	Portion float64 `db:"portion" json:"portion"`
	Protein float64 `db:"protein" json:"protein"`
	Carb    float64 `db:"carb" json:"carb"`
	Fibre   float64 `db:"fibre" json:"fibre"`
	Fat     float64 `db:"fat" json:"fat"`
}

type TblUserBodyLog struct {
	ID       int        `db:"id" json:"id"`
	UserID   int        `db:"user_id" json:"user_id"`
	Created  UnixMillis `db:"created" json:"created"`
	UserTime UnixMillis `db:"user_time" json:"user_time"`

	// Core metrics
	WeightKg       float64 `db:"weight_kg" json:"weight_kg"`
	HeightCm       float64 `db:"height_cm" json:"height_cm"`
	BodyFatPercent float64 `db:"body_fat_percent" json:"body_fat_percent"`
	BMI            float64 `db:"bmi" json:"bmi"`

	// Blood pressure & heart
	BPSystolic   int16 `db:"bp_systolic" json:"bp_systolic"`
	BPDiastolic  int16 `db:"bp_diastolic" json:"bp_diastolic"`
	HeartRateBPM int16 `db:"heart_rate_bpm" json:"heart_rate_bpm"`

	// Lifestyle data
	StepsCount int `db:"steps_count" json:"steps_count"`
}

type TblUserMedication struct {
	ID           int        `db:"id" json:"id"`
	UserID       int        `db:"user_id" json:"user_id"`
	Created      UnixMillis `db:"created" json:"created"`
	Name         string     `db:"name" json:"name"`
	Category     string     `db:"category" json:"category"`
	DosageAmount float64    `db:"dosage_amount" json:"dosage_amount"`
	DosageUnit   string     `db:"dosage_unit" json:"dosage_unit"`
	Form         string     `db:"form" json:"form"` // tablet, capsule, liquid
	StartDate    UnixMillis `db:"start_date" json:"start_date"`
	EndDate      UnixMillis `db:"end_date" json:"end_date"`
	Notes        string     `db:"notes" json:"notes"`
}

type TblUserMedicationSchedule struct {
	ID                int        `db:"id" json:"id"`
	MedicationID      int        `db:"medication_id" json:"medication_id"`
	Created           UnixMillis `db:"created" json:"created"`
	MinutesOfHourMask int64      `db:"minutes_of_hour_mask" json:"minutes_of_hour_mask"` // BIT(60)
	HoursOfDayMask    int32      `db:"hours_of_day_mask" json:"hours_of_day_mask"`       // BIT(24)
	DaysOfWeekMask    int8       `db:"days_of_week_mask" json:"days_of_week_mask"`       // BIT(7)
	DaysOfMonthMask   int32      `db:"days_of_month_mask" json:"days_of_month_mask"`     // BIT(31)
	WithFood          bool       `db:"with_food" json:"with_food"`
	Fasting           bool       `db:"fasting" json:"fasting"`
	ReminderEnabled   bool       `db:"reminder_enabled" json:"reminder_enabled"`
	Notes             string     `db:"notes" json:"notes"`
}

type TblUserMedicationLog struct {
	ID         int        `db:"id" json:"id"`
	ScheduleID int        `db:"schedule_id" json:"schedule_id"`
	TakenTime  UnixMillis `db:"taken_time" json:"taken_time"`
	Taken      bool       `db:"taken" json:"taken"`
	Notes      string     `db:"notes" json:"notes"`
}

type TblDataSource struct {
	ID      int        `db:"id" json:"id"`
	Created UnixMillis `db:"created" json:"created"`
	Name    string     `db:"name" json:"name"`
	Url     string     `db:"url" json:"url"`
	Notes   string     `db:"notes" json:"notes"`
}
type TblDataSourceFood struct {
	ID           int        `db:"id" json:"id"`
	DataSourceID int        `db:"data_source_id" json:"data_source_id"`
	Created      UnixMillis `db:"created" json:"created"`

	Name            string  `db:"name" json:"name"`
	Unit            string  `db:"unit" json:"unit"`
	Portion         float64 `db:"portion" json:"portion"`
	Protein         float64 `db:"protein" json:"protein"`
	Carb            float64 `db:"carb" json:"carb"`
	Fibre           float64 `db:"fibre" json:"fibre"`
	Fat             float64 `db:"fat" json:"fat"`
	DataSourceRowID int     `db:"data_source_row_int_id" json:"data_source_row_int_id"`
}
