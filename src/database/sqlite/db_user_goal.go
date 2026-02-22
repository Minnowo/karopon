package sqlite

import (
	"context"
	"fmt"
	"karopon/src/database"
	"time"

	"github.com/rs/zerolog/log"
)

func (db *SqliteDatabase) LoadUserGoals(ctx context.Context, userId int, out *[]database.TblUserGoal) error {

	query := `
		SELECT * FROM PON_USER_GOAL g
		WHERE g.USER_ID = $1
		ORDER BY g.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *SqliteDatabase) DeleteUserGoal(ctx context.Context, userId int, goalId int) error {

	query := `DELETE FROM PON_USER_GOAL WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userId, goalId)

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

func (db *SqliteDatabase) LoadUserGoalProgress(ctx context.Context, curTime time.Time, userGoal *database.TblUserGoal, out *database.UserGoalProgress) error {

	startTime, endTime, err := userGoal.TimeRange(curTime)

	if err != nil {
		return err
	}

	var aggSql string

	switch userGoal.Aggregation() {
	default:
		return fmt.Errorf("Aggregation is invalild")
	case database.AggregationSum:
		aggSql = "SUM"
	case database.AggregationAvg:
		aggSql = "AVG"
	case database.AggregationMin:
		aggSql = "MIN"
	case database.AggregationMax:
		aggSql = "MAX"

	}

	var colSql string
	var tableSql string
	var whereSql string

	switch userGoal.TargetColumn() {
	default:
		return fmt.Errorf("TargetColumn is invalild")

	case database.TargetColumnCalories:
		// TODO: don't hard code this and make it use the user's setting
		tableSql = "PON_USER_FOODLOG"
		colSql = "PROTEIN * 4 + (CARB - FIBRE) * 4 + FAT * 9"
		whereSql = ""
	case database.TargetColumnNetCarbs:
		tableSql = "PON_USER_FOODLOG"
		colSql = "CARB - FIBRE"
		whereSql = ""
	case database.TargetColumnFat:
		tableSql = "PON_USER_FOODLOG"
		colSql = "FAT"
		whereSql = ""
	case database.TargetColumnCarbs:
		tableSql = "PON_USER_FOODLOG"
		colSql = "CARB"
		whereSql = ""
	case database.TargetColumnFibre:
		tableSql = "PON_USER_FOODLOG"
		colSql = "FIBRE"
		whereSql = ""
	case database.TargetColumnProtein:
		tableSql = "PON_USER_FOODLOG"
		colSql = "PROTEIN"
		whereSql = ""

	case database.TargetColumnBodyWeightKg:
		tableSql = "PON_USER_BODYLOG"
		colSql = "WEIGHT_KG"
		whereSql = " AND WEIGHT_KG > 0"
	case database.TargetColumnBodyWeightLbs:
		tableSql = "PON_USER_BODYLOG"
		colSql = "WEIGHT_KG * 2.2046226218"
		whereSql = " AND WEIGHT_KG > 0"
	case database.TargetColumnBodyFatPercent:
		tableSql = "PON_USER_BODYLOG"
		colSql = "BODY_FAT_PERCENT"
		whereSql = " AND BODY_FAT_PERCENT > 0"
	case database.TargetColumnBodyHeartRate:
		tableSql = "PON_USER_BODYLOG"
		colSql = "HEART_RATE_BPM"
		whereSql = " AND HEART_RATE_BPM > 0"
	case database.TargetColumnBodySteps:
		tableSql = "PON_USER_BODYLOG"
		colSql = "STEPS_COUNT"
		whereSql = " AND STEPS_COUNT > 0"
	case database.TargetColumnBodyBloodPressureSys:
		tableSql = "PON_USER_BODYLOG"
		colSql = "BP_SYSTOLIC"
		whereSql = " AND BP_SYSTOLIC > 0"
	case database.TargetColumnBodyBloodPressureDia:
		tableSql = "PON_USER_BODYLOG"
		colSql = "BP_DIASTOLIC"
		whereSql = " AND BP_DIASTOLIC > 0"

	case database.TargetColumnEventBloodSugar:
		tableSql = "PON_USER_EVENTLOG"
		colSql = "BLOOD_GLUCOSE"
		whereSql = " AND BLOOD_GLUCOSE > 0"
	}

	query := `
		SELECT ` + aggSql + `(` + colSql + `) AS CURRENT_VALUE 
 		FROM ` + tableSql + ` WHERE 
		USER_ID = $1
		AND USER_TIME >= $2
		AND USER_TIME <= $3
	` + whereSql

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
