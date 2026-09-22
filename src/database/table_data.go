package database

import (
	"time"
)

type TblConfig struct {
	Version Version `db:"version" json:"version"`
}

type TblUserEvent struct {
	ID     int    `db:"id"      json:"id"`
	UserID int    `db:"user_id" json:"user_id"`
	Name   string `db:"name"    json:"name"`
}

type CalorieCalcMethod string

var (
	CALORIE_AUTO           CalorieCalcMethod = "auto"
	CALORIE_ATWATER        CalorieCalcMethod = "atwater"
	CALORIE_ATWATERNOFIBRE CalorieCalcMethod = "atwater_no_fibre"
)

type TblUser struct {
	ID       int        `db:"id"       json:"id"`
	Name     string     `db:"name"     json:"name"`
	Password []byte     `db:"password" json:"-"`
	Created  TimeMillis `db:"created"  json:"created"`

	// settings
	Theme                     string            `db:"theme"                        json:"theme"`
	ShowDiabetes              bool              `db:"show_diabetes"                json:"show_diabetes"`
	CaloricCalcMethod         CalorieCalcMethod `db:"caloric_calc_method"          json:"caloric_calc_method"`
	InsulinSensitivityFactor  float64           `db:"insulin_sensitivity_factor"   json:"insulin_sensitivity_factor"`
	EventHistoryFetchLimit    int               `db:"event_history_fetch_limit"    json:"event_history_fetch_limit"`
	TargetBloodSugar          float64           `db:"target_blood_sugar"           json:"target_blood_sugar"`
	SessionExpireTimeSeconds  int64             `db:"session_expire_time_seconds"  json:"session_expire_time_seconds"`
	TimeFormat                string            `db:"time_format"                  json:"time_format"`
	DateFormat                string            `db:"date_format"                  json:"date_format"`
	EventLogTrailingRows      int               `db:"event_log_trailing_rows"      json:"event_log_trailing_rows"`
	DayTimeOffsetSeconds      int               `db:"day_time_offset_seconds"      json:"day_time_offset_seconds"`
	FillEventLogFromLast      bool              `db:"fill_eventlog_from_last"      json:"fill_eventlog_from_last"`
	TimespanHistoryFetchLimit int               `db:"timespan_history_fetch_limit" json:"timespan_history_fetch_limit"`
}

// NewDefaultTblUser builds a TblUser with the default settings assigned to
// newly created users. password must already be hashed (see bcrypt).
func NewDefaultTblUser(username string, password []byte) TblUser {
	return TblUser{
		Name:                      username,
		Password:                  password,
		Theme:                     "auto",
		ShowDiabetes:              true,
		CaloricCalcMethod:         "auto",
		EventHistoryFetchLimit:    50,
		InsulinSensitivityFactor:  3,
		TargetBloodSugar:          5.6,
		FillEventLogFromLast:      false,
		TimespanHistoryFetchLimit: 50,
		SessionExpireTimeSeconds:  int64(time.Duration(time.Hour * 24 * 10).Seconds()),
	}
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
		ID:                        u.ID,
		Name:                      u.Name,
		Password:                  pw,
		Created:                   u.Created,
		Theme:                     u.Theme,
		ShowDiabetes:              u.ShowDiabetes,
		CaloricCalcMethod:         u.CaloricCalcMethod,
		InsulinSensitivityFactor:  u.InsulinSensitivityFactor,
		EventHistoryFetchLimit:    u.EventHistoryFetchLimit,
		TargetBloodSugar:          u.TargetBloodSugar,
		SessionExpireTimeSeconds:  u.SessionExpireTimeSeconds,
		TimeFormat:                u.TimeFormat,
		DateFormat:                u.DateFormat,
		EventLogTrailingRows:      u.EventLogTrailingRows,
		DayTimeOffsetSeconds:      u.DayTimeOffsetSeconds,
		FillEventLogFromLast:      u.FillEventLogFromLast,
		TimespanHistoryFetchLimit: u.TimespanHistoryFetchLimit,
	}
}

type TblUserSession struct {
	UserID    int        `db:"user_id"    json:"user_id"`
	Created   TimeMillis `db:"created"    json:"created"`
	Expires   TimeMillis `db:"expires"    json:"expires"`
	Token     []byte     `db:"token"      json:"token"`
	UserAgent string     `db:"user_agent" json:"user_agent"`
}

type TblUserEventLog struct {
	ID                       int        `db:"id"                         json:"id"`
	UserID                   int        `db:"user_id"                    json:"user_id"`
	EventID                  int        `db:"event_id"                   json:"event_id"`
	Created                  TimeMillis `db:"created"                    json:"created"`
	UserTime                 TimeMillis `db:"user_time"                  json:"user_time"`
	Event                    string     `db:"event"                      json:"event"`
	NetCarbs                 float64    `db:"net_carbs"                  json:"net_carbs"`
	BloodGlucose             float64    `db:"blood_glucose"              json:"blood_glucose"`
	BloodGlucoseTarget       float64    `db:"blood_glucose_target"       json:"blood_glucose_target"`
	InsulinSensitivityFactor float64    `db:"insulin_sensitivity_factor" json:"insulin_sensitivity_factor"`
	InsulinToCarbRatio       float64    `db:"insulin_to_carb_ratio"      json:"insulin_to_carb_ratio"`
	RecommendedInsulinAmount float64    `db:"recommended_insulin_amount" json:"recommended_insulin_amount"`
	ActualInsulinTaken       float64    `db:"actual_insulin_taken"       json:"actual_insulin_taken"`
}

type TblUserFood struct {
	ID      int     `db:"id"      json:"id"`
	UserID  int     `db:"user_id" json:"-"`
	Name    string  `db:"name"    json:"name"`
	Unit    string  `db:"unit"    json:"unit"`
	Portion float64 `db:"portion" json:"portion"`
	Protein float64 `db:"protein" json:"protein"`
	Carb    float64 `db:"carb"    json:"carb"`
	Fibre   float64 `db:"fibre"   json:"fibre"`
	Fat     float64 `db:"fat"     json:"fat"`
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
	ID         int        `db:"id"          json:"id"`
	UserID     int        `db:"user_id"     json:"user_id"`
	EventLogID int        `db:"eventlog_id" json:"eventlog_id"`
	FoodID     *int       `db:"food_id"     json:"food_id"`
	Created    TimeMillis `db:"created"     json:"created"`
	UserTime   TimeMillis `db:"user_time"   json:"user_time"`
	Name       string     `db:"name"        json:"name"`

	Event string `db:"event" json:"event"`
	Unit  string `db:"unit"  json:"unit"`

	Portion float64 `db:"portion" json:"portion"`
	Protein float64 `db:"protein" json:"protein"`
	Carb    float64 `db:"carb"    json:"carb"`
	Fibre   float64 `db:"fibre"   json:"fibre"`
	Fat     float64 `db:"fat"     json:"fat"`
}

type TblUserBodyLog struct {
	ID       int        `db:"id"        json:"id"`
	UserID   int        `db:"user_id"   json:"user_id"`
	Created  TimeMillis `db:"created"   json:"created"`
	UserTime TimeMillis `db:"user_time" json:"user_time"`
}

// TblUserBodyMetric is a user-defined body metric they wish to track,
// e.g. "Weight" ("kg"), "Waist" ("cm"). Holds no values itself.
type TblUserBodyMetric struct {
	ID     int    `db:"id"      json:"id"`
	UserID int    `db:"user_id" json:"user_id"`
	Name   string `db:"name"    json:"name"`
	Unit   string `db:"unit"    json:"unit"`
}

// TblUserBodyLogMetric is a single metric value recorded against a TblUserBodyLog.
type TblUserBodyLogMetric struct {
	BodyLogID    int     `db:"bodylog_id"     json:"bodylog_id"`
	BodyMetricID int     `db:"body_metric_id" json:"body_metric_id"`
	Value        float64 `db:"value"          json:"value"`
}

type TblUserMedication struct {
	ID           int        `db:"id"            json:"id"`
	UserID       int        `db:"user_id"       json:"user_id"`
	Created      TimeMillis `db:"created"       json:"created"`
	Name         string     `db:"name"          json:"name"`
	Category     string     `db:"category"      json:"category"`
	DosageAmount float64    `db:"dosage_amount" json:"dosage_amount"`
	DosageUnit   string     `db:"dosage_unit"   json:"dosage_unit"`
	Form         string     `db:"form"          json:"form"` // tablet, capsule, liquid
	StartDate    TimeMillis `db:"start_date"    json:"start_date"`
	EndDate      TimeMillis `db:"end_date"      json:"end_date"`
	Notes        string     `db:"notes"         json:"notes"`
}

type TblUserMedicationSchedule struct {
	ID                int        `db:"id"                   json:"id"`
	MedicationID      int        `db:"medication_id"        json:"medication_id"`
	Created           TimeMillis `db:"created"              json:"created"`
	MinutesOfHourMask int64      `db:"minutes_of_hour_mask" json:"minutes_of_hour_mask"` // BIT(60)
	HoursOfDayMask    int32      `db:"hours_of_day_mask"    json:"hours_of_day_mask"`    // BIT(24)
	DaysOfWeekMask    int8       `db:"days_of_week_mask"    json:"days_of_week_mask"`    // BIT(7)
	DaysOfMonthMask   int32      `db:"days_of_month_mask"   json:"days_of_month_mask"`   // BIT(31)
	WithFood          bool       `db:"with_food"            json:"with_food"`
	Fasting           bool       `db:"fasting"              json:"fasting"`
	ReminderEnabled   bool       `db:"reminder_enabled"     json:"reminder_enabled"`
	Notes             string     `db:"notes"                json:"notes"`
}

type TblUserMedicationLog struct {
	ID         int        `db:"id"          json:"id"`
	ScheduleID int        `db:"schedule_id" json:"schedule_id"`
	TakenTime  TimeMillis `db:"taken_time"  json:"taken_time"`
	Taken      bool       `db:"taken"       json:"taken"`
	Notes      string     `db:"notes"       json:"notes"`
}

type TblDataSource struct {
	ID      int        `db:"id"      json:"id"`
	Created TimeMillis `db:"created" json:"created"`
	Name    string     `db:"name"    json:"name"`
	URL     string     `db:"url"     json:"url"`
	Notes   string     `db:"notes"   json:"notes"`
}

type TblDataSourceFood struct {
	ID           int        `db:"id"             json:"id"`
	DataSourceID int        `db:"data_source_id" json:"data_source_id"`
	Created      TimeMillis `db:"created"        json:"created"`

	Name            string  `db:"name"                   json:"name"`
	Unit            string  `db:"unit"                   json:"unit"`
	Portion         float64 `db:"portion"                json:"portion"`
	Protein         float64 `db:"protein"                json:"protein"`
	Carb            float64 `db:"carb"                   json:"carb"`
	Fibre           float64 `db:"fibre"                  json:"fibre"`
	Fat             float64 `db:"fat"                    json:"fat"`
	DataSourceRowID int     `db:"data_source_row_int_id" json:"data_source_row_int_id"`
}

type TblUserGoal struct {
	ID              int        `db:"id"               json:"id"`
	UserID          int        `db:"user_id"          json:"user_id"`
	Created         TimeMillis `db:"created"          json:"created"`
	Name            string     `db:"name"             json:"name"`
	TargetValue     float64    `db:"target_value"     json:"target_value"`
	TargetCol       string     `db:"target_col"       json:"target_col"`
	AggregationType string     `db:"aggregation_type" json:"aggregation_type"`
	ValueComparison string     `db:"value_comparison" json:"value_comparison"`
	TimeExpr        string     `db:"time_expr"        json:"time_expr"`
	TargetMetric    string     `db:"target_metric"    json:"target_metric"`
}

func (u *TblUserGoal) TimeRange(now time.Time, shift time.Duration) (time.Time, time.Time, error) {
	return ParseGoalTimeExpression(u.TimeExpr, now, shift)
}

func (u *TblUserGoal) TargetColumn() GoalTargetColumn {
	return GoalTargetColumn(u.TargetCol)
}

func (u *TblUserGoal) Aggregation() AggregationFunc {

	return AggregationFunc(u.AggregationType)
}

func (u *TblUserGoal) Comparison() GoalValueComparison {

	return GoalValueComparison(u.ValueComparison)
}

type TblUserTag struct {
	ID      int        `db:"id"      json:"-"`
	UserID  int        `db:"user_id" json:"-"`
	Created TimeMillis `db:"created" json:"-"`

	Namespace string `db:"namespace" json:"namespace"`
	Name      string `db:"name"      json:"name"`
}

type TblUserTimespan struct {
	ID      int        `db:"id"      json:"id"`
	UserID  int        `db:"user_id" json:"user_id"`
	Created TimeMillis `db:"created" json:"created"`

	StartTime TimeMillis `db:"start_time" json:"start_time"`
	StopTime  TimeMillis `db:"stop_time"  json:"stop_time"`

	Note *string `db:"note" json:"note"`
}

type TblUserTimespanTag struct {
	TimespanID int `db:"timespan_id" json:"timespan_id"`
	TagID      int `db:"tag_id"      json:"tag_id"`
}

// TblUserActivity is a reusable break-activity definition (e.g. "Calf raises"),
// modeled on TblUserFood: a shape the user defines once and logs instances of
// later as tagged timespans.
type TblUserActivity struct {
	ID       int    `db:"id"       json:"id"`
	UserID   int    `db:"user_id"  json:"-"`
	Name     string `db:"name"     json:"name"`
	TagID    int    `db:"tag_id"   json:"-"`
	Duration int    `db:"duration" json:"duration"`
	Note     string `db:"note"     json:"note"`
}

// TblUserReminder is a user-configured recurring nudge. LastActivityAt is the
// anchor the client diffs against (LastActivityAt + IntervalMinutes) to compute
// its countdown; logging, skipping, or snoozing all just update this timestamp.
// Cron is a minimal cron-like schedule string: a flat list of "D:HHMM-HHMM" windows
// (day 0=Sunday..6=Saturday matching JS Date.getDay()) joined by the ASCII Unit
// Separator (0x1F, unreachable from a keyboard), mirroring how goalspage's tag-based
// goals encode their tag list into TblUserGoal.TargetMetric. It is opaque to the
// backend and interpreted entirely client-side; an empty string means the reminder
// never fires.
type TblUserReminder struct {
	ID              int        `db:"id"               json:"id"`
	UserID          int        `db:"user_id"          json:"-"`
	Name            string     `db:"name"             json:"name"`
	Enabled         bool       `db:"enabled"          json:"enabled"`
	IntervalMinutes int        `db:"interval_minutes" json:"interval_minutes"`
	LastActivityAt  TimeMillis `db:"last_activity_at" json:"last_activity_at"`
	Cron            string     `db:"cron"             json:"cron"`
	ActivityMode    string     `db:"activity_mode"    json:"activity_mode"`
	Sound           string     `db:"sound"            json:"sound"`
	AlarmMode       string     `db:"alarm_mode"       json:"alarm_mode"`

	// ActiveTimers is a JSON object mapping activity ID -> the currently running
	// timespan ID for that activity (e.g. {"3": 41}), so a start/stop timer
	// survives a page reload or a different device. Opaque to the backend.
	ActiveTimers string `db:"active_timers" json:"active_timers"`
}

type TblUserReminderActivity struct {
	ReminderID int `db:"reminder_id" json:"reminder_id"`
	ActivityID int `db:"activity_id" json:"activity_id"`
}

type TblUserDashboard struct {
	ID     int    `db:"id"      json:"id"`
	UserID int    `db:"user_id" json:"user_id"`
	Name   string `db:"name"    json:"name"`
	Data   string `db:"data"    json:"data"`
}

type TblUserTagColor struct {
	UserID    int    `db:"user_id"   json:"user_id"`
	Namespace string `db:"namespace" json:"namespace"`
	Color     string `db:"color"     json:"color"`
}

type TblUserPhoto struct {
	ID     int    `db:"id"      json:"id"`
	UserID int    `db:"user_id" json:"user_id"`
	Data   []byte `db:"data"    json:"-"`
}
