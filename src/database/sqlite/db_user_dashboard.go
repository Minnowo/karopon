package sqlite

import (
	"context"
	"karopon/src/database"
)

func (db *SqliteDatabase) LoadUserDashboards(ctx context.Context, userID int, out *[]database.TblUserDashboard) error {

	query := `
		SELECT * FROM PON_USER_DASHBOARD
		WHERE USER_ID = $1
		ORDER BY ID ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) AddUserDashboard(ctx context.Context, dashboard *database.TblUserDashboard) (int, error) {

	query := `
		INSERT INTO PON_USER_DASHBOARD (
			USER_ID, NAME, DATA
		) VALUES (
			:USER_ID, :NAME, :DATA
		)
	`

	return db.NamedInsertGetLastRowID(ctx, query, dashboard)
}

func (db *SqliteDatabase) UpdateUserDashboard(ctx context.Context, dashboard *database.TblUserDashboard) error {

	query := `
		UPDATE PON_USER_DASHBOARD
		SET NAME = :NAME, DATA = :DATA
		WHERE ID = :ID AND USER_ID = :USER_ID
	`

	_, err := db.NamedExecContext(ctx, query, dashboard)

	return err
}

func (db *SqliteDatabase) DeleteUserDashboard(ctx context.Context, userID, dashboardID int) error {

	query := `DELETE FROM PON_USER_DASHBOARD WHERE ID = $1 AND USER_ID = $2`

	_, err := db.ExecContext(ctx, query, dashboardID, userID)

	return err
}
