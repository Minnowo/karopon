package postgres

import (
	"context"
	"karopon/src/database"
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
			target_metric,
			aggregation_type,
			value_comparison,
			time_expr
		) VALUES (
			:user_id,
			:name,
			:target_value,
			:target_col,
			:target_metric,
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

func (db *PGDatabase) UpdateUserGoal(ctx context.Context, userGoal *database.TblUserGoal) error {

	query := `
		UPDATE PON.USER_GOAL SET
			name             = :name,
			target_value     = :target_value,
			target_col       = :target_col,
			target_metric    = :target_metric,
			aggregation_type = :aggregation_type,
			value_comparison = :value_comparison,
			time_expr        = :time_expr
		WHERE id = :id AND user_id = :user_id
	`

	_, err := db.NamedExecContext(ctx, query, userGoal)

	return err
}
