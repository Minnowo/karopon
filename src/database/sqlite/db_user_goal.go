package sqlite

import (
	"context"
	"karopon/src/database"
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
			TARGET_METRIC,
			AGGREGATION_TYPE,
			VALUE_COMPARISON,
			TIME_EXPR
		) VALUES (
			:USER_ID,
			:NAME,
			:TARGET_VALUE,
			:TARGET_COL,
			:TARGET_METRIC,
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

func (db *SqliteDatabase) UpdateUserGoal(ctx context.Context, userGoal *database.TblUserGoal) error {

	query := `
		UPDATE PON_USER_GOAL SET
			NAME             = :NAME,
			TARGET_VALUE     = :TARGET_VALUE,
			TARGET_COL       = :TARGET_COL,
			TARGET_METRIC    = :TARGET_METRIC,
			AGGREGATION_TYPE = :AGGREGATION_TYPE,
			VALUE_COMPARISON = :VALUE_COMPARISON,
			TIME_EXPR        = :TIME_EXPR
		WHERE ID = :ID AND USER_ID = :USER_ID
	`

	_, err := db.NamedExecContext(ctx, query, userGoal)

	return err
}
