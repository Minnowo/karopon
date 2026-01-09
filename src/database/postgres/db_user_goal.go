package postgres

import (
	"context"
	"fmt"
	"karopon/src/database"
	"time"

	"github.com/rs/zerolog/log"
)

func (db *PGDatabase) LoadUserGoals(ctx context.Context, userId int, out *[]database.TblUserGoal) error {

	query := `
		SELECT * FROM PON.USER_GOAL g
		WHERE g.USER_ID = $1
		ORDER BY g.NAME ASC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) DeleteUserGoal(ctx context.Context, userId int, goalId int) error {

	query := `DELETE FROM PON.USER_GOAL WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userId, goalId)

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

	id, err := db.InsertOneNamedGetID(ctx, query, userGoal)

	if err != nil {
		return -1, err
	}

	return id, nil
}

func (db *PGDatabase) LoadUserGoalProgress(ctx context.Context, curTime time.Time, userGoal *database.TblUserGoal, out *database.UserGoalProgress) error {

	startTime, endTime, err := userGoal.TimeRange(curTime)

	if err != nil {
		return err
	}

	var colSql string
	var aggSql string

	switch userGoal.TargetColumn() {
	default:
		return fmt.Errorf("TargetColumn is invalild")
	case database.TargetColumnCalories:
		// TODO: don't hard code this and make it use the user's setting
		colSql = "PROTEIN * 4 + (CARB - FIBRE) * 4 + FAT * 9"
	case database.TargetColumnNetCarbs:
		colSql = "CARB - FIBRE"
	case database.TargetColumnFat:
		colSql = "FAT"
	case database.TargetColumnCarbs:
		colSql = "CARB"
	case database.TargetColumnFibre:
		colSql = "FIBRE"
	case database.TargetColumnProtein:
		colSql = "PROTEIN"
	}

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

	query := `
		SELECT ` + aggSql + `(` + colSql + `) AS CURRENT_VALUE 
 		FROM PON.USER_FOODLOG
		WHERE USER_ID = $1
		AND USER_TIME >= $2
		AND USER_TIME <= $3
	`

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
