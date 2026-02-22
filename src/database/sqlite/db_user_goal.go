package sqlite

import (
	"context"
	"karopon/src/database"
	"time"

	"github.com/rs/zerolog/log"
)

func (db *SqliteDatabase) LoadUserGoals(ctx context.Context, userID int, out *[]database.TblUserGoal) error {

	query := `
		SELECT * FROM PON_USER_GOAL g
		WHERE g.USER_ID = $1
		ORDER BY g.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) DeleteUserGoal(ctx context.Context, userID int, goalID int) error {

	query := `DELETE FROM PON_USER_GOAL WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, goalID)

	return err
}

func (db *SqliteDatabase) AddUserGoal(ctx context.Context, userGoal *database.TblUserGoal) (int, error) {

	query := `
		INSERT INTO PON_USER_GOAL (
			USER_ID,
			NAME,
			TARGET_VALUE,
			TARGET_COL,
			AGGREGATION_TYPE,
			VALUE_COMPARISON,
			TIME_EXPR
		) VALUES (
			:USER_ID,
			:NAME,
			:TARGET_VALUE,
			:TARGET_COL,
			:AGGREGATION_TYPE,
			:VALUE_COMPARISON,
			:TIME_EXPR
		)
	`

	id, err := db.NamedInsertGetLastRowID(ctx, query, userGoal)

	if err != nil {
		return -1, err
	}

	return id, nil
}

func (db *SqliteDatabase) LoadUserGoalProgress(
	ctx context.Context,
	curTime time.Time,
	userGoal *database.TblUserGoal,
	out *database.UserGoalProgress,
) error {

	startTime, endTime, err := userGoal.TimeRange(curTime)

	if err != nil {
		return err
	}

	var aggSQL string

	switch userGoal.Aggregation() {
	default:
		return database.ErrInvalidGoalAggregation
	case database.AggregationSum:
		aggSQL = "SUM"
	case database.AggregationAvg:
		aggSQL = "AVG"
	case database.AggregationMin:
		aggSQL = "MIN"
	case database.AggregationMax:
		aggSQL = "MAX"

	}

	var colSQL string
	var tableSQL string
	var whereSQL string

	switch userGoal.TargetColumn() {
	default:
		return database.ErrInvalidGoalTargetColumn

	case database.TargetColumnCalories:
		// TODO: don't hard code this and make it use the user's setting
		tableSQL = "PON_USER_FOODLOG"
		colSQL = "PROTEIN * 4 + (CARB - FIBRE) * 4 + FAT * 9"
		whereSQL = ""
	case database.TargetColumnNetCarbs:
		tableSQL = "PON_USER_FOODLOG"
		colSQL = "CARB - FIBRE"
		whereSQL = ""
	case database.TargetColumnFat:
		tableSQL = "PON_USER_FOODLOG"
		colSQL = "FAT"
		whereSQL = ""
	case database.TargetColumnCarbs:
		tableSQL = "PON_USER_FOODLOG"
		colSQL = "CARB"
		whereSQL = ""
	case database.TargetColumnFibre:
		tableSQL = "PON_USER_FOODLOG"
		colSQL = "FIBRE"
		whereSQL = ""
	case database.TargetColumnProtein:
		tableSQL = "PON_USER_FOODLOG"
		colSQL = "PROTEIN"
		whereSQL = ""

	case database.TargetColumnBodyWeightKg:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "WEIGHT_KG"
		whereSQL = " AND WEIGHT_KG > 0"
	case database.TargetColumnBodyWeightLbs:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "WEIGHT_KG * 2.2046226218"
		whereSQL = " AND WEIGHT_KG > 0"
	case database.TargetColumnBodyFatPercent:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "BODY_FAT_PERCENT"
		whereSQL = " AND BODY_FAT_PERCENT > 0"
	case database.TargetColumnBodyHeartRate:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "HEART_RATE_BPM"
		whereSQL = " AND HEART_RATE_BPM > 0"
	case database.TargetColumnBodySteps:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "STEPS_COUNT"
		whereSQL = " AND STEPS_COUNT > 0"
	case database.TargetColumnBodyBloodPressureSys:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "BP_SYSTOLIC"
		whereSQL = " AND BP_SYSTOLIC > 0"
	case database.TargetColumnBodyBloodPressureDia:
		tableSQL = "PON_USER_BODYLOG"
		colSQL = "BP_DIASTOLIC"
		whereSQL = " AND BP_DIASTOLIC > 0"

	case database.TargetColumnEventBloodSugar:
		tableSQL = "PON_USER_EVENTLOG"
		colSQL = "BLOOD_GLUCOSE"
		whereSQL = " AND BLOOD_GLUCOSE > 0"
	}

	query := `
		SELECT ` + aggSQL + `(` + colSQL + `) AS CURRENT_VALUE 
 		FROM ` + tableSQL + ` WHERE 
		USER_ID = $1
		AND USER_TIME >= $2
		AND USER_TIME <= $3
	` + whereSQL

	var curValue struct {
		CurrentValue *float64 `db:"current_value"`
	}

	log.Debug().
		Str("sql", query).
		Int("userID", userGoal.UserID).
		Time("start", startTime).
		Time("end", endTime).
		Dur("range", endTime.Sub(startTime)).
		Msg("getting user goal progress")

	err = db.GetContext(ctx, &curValue, query, userGoal.UserID, startTime.UTC(), endTime.UTC())

	if err != nil {
		return err
	}

	if curValue.CurrentValue != nil {
		out.CurrentValue = *curValue.CurrentValue
	}
	out.TargetValue = userGoal.TargetValue
	out.TimeRemaining = database.DurationMillis(endTime.Sub(curTime))

	return nil
}
