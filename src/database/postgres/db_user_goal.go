package postgres

import (
	"context"
	"karopon/src/database"
	"time"

	"github.com/rs/zerolog/log"
)

func (db *PGDatabase) LoadUserGoals(ctx context.Context, userID int, out *[]database.TblUserGoal) error {

	query := `
		SELECT * FROM PON.USER_GOAL g
		WHERE g.USER_ID = $1
		ORDER BY g.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) DeleteUserGoal(ctx context.Context, userID int, goalID int) error {

	query := `DELETE FROM PON.USER_GOAL WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, goalID)

	return err
}

func (db *PGDatabase) AddUserGoal(ctx context.Context, userGoal *database.TblUserGoal) (int, error) {

	query := `
		INSERT INTO PON.USER_GOAL (
			user_id,
			name,
			target_value,
			target_col,
			aggregation_type,
			value_comparison,
			time_expr
		) VALUES (
			:user_id,
			:name,
			:target_value,
			:target_col,
			:aggregation_type,
			:value_comparison,
			:time_expr
		)
		RETURNING id
	`

	id, err := db.NamedInsertReturningID(ctx, query, userGoal)

	if err != nil {
		return -1, err
	}

	return id, nil
}

func (db *PGDatabase) LoadUserGoalProgress(
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
		tableSQL = "PON.USER_FOODLOG"
		colSQL = "PROTEIN * 4 + (CARB - FIBRE) * 4 + FAT * 9"
		whereSQL = ""
	case database.TargetColumnNetCarbs:
		tableSQL = "PON.USER_FOODLOG"
		colSQL = "CARB - FIBRE"
		whereSQL = ""
	case database.TargetColumnFat:
		tableSQL = "PON.USER_FOODLOG"
		colSQL = "FAT"
		whereSQL = ""
	case database.TargetColumnCarbs:
		tableSQL = "PON.USER_FOODLOG"
		colSQL = "CARB"
		whereSQL = ""
	case database.TargetColumnFibre:
		tableSQL = "PON.USER_FOODLOG"
		colSQL = "FIBRE"
		whereSQL = ""
	case database.TargetColumnProtein:
		tableSQL = "PON.USER_FOODLOG"
		colSQL = "PROTEIN"
		whereSQL = ""

	case database.TargetColumnBodyWeightKg:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "WEIGHT_KG"
		whereSQL = " AND WEIGHT_KG > 0"
	case database.TargetColumnBodyWeightLbs:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "WEIGHT_KG * 2.2046226218"
		whereSQL = " AND WEIGHT_KG > 0"
	case database.TargetColumnBodyFatPercent:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "BODY_FAT_PERCENT"
		whereSQL = " AND BODY_FAT_PERCENT > 0"
	case database.TargetColumnBodyHeartRate:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "HEART_RATE_BPM"
		whereSQL = " AND HEART_RATE_BPM > 0"
	case database.TargetColumnBodySteps:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "STEPS_COUNT"
		whereSQL = " AND STEPS_COUNT > 0"
	case database.TargetColumnBodyBloodPressureSys:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "BP_SYSTOLIC"
		whereSQL = " AND BP_SYSTOLIC > 0"
	case database.TargetColumnBodyBloodPressureDia:
		tableSQL = "PON.USER_BODYLOG"
		colSQL = "BP_DIASTOLIC"
		whereSQL = " AND BP_DIASTOLIC > 0"

	case database.TargetColumnEventBloodSugar:
		tableSQL = "PON.USER_EVENTLOG"
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
