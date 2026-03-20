package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) LoadUserDashboards(ctx context.Context, userID int, out *[]database.TblUserDashboard) error {

	query := `SELECT id, user_id, name, data FROM PON.USER_DASHBOARD WHERE user_id = $1 ORDER BY id ASC`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) AddUserDashboard(ctx context.Context, dashboard *database.TblUserDashboard) (int, error) {

	query := `
		INSERT INTO PON.USER_DASHBOARD (user_id, name, data)
		VALUES (:user_id, :name, :data)
		RETURNING id
	`

	return db.NamedInsertReturningID(ctx, query, dashboard)
}

func (db *PGDatabase) UpdateUserDashboard(ctx context.Context, dashboard *database.TblUserDashboard) error {

	query := `
		UPDATE PON.USER_DASHBOARD
		SET name = :name, data = :data
		WHERE id = :id AND user_id = :user_id
	`

	_, err := db.NamedExecContext(ctx, query, dashboard)

	return err
}

func (db *PGDatabase) DeleteUserDashboard(ctx context.Context, userID, dashboardID int) error {

	query := `DELETE FROM PON.USER_DASHBOARD WHERE id = $1 AND user_id = $2`

	_, err := db.ExecContext(ctx, query, dashboardID, userID)

	return err
}
