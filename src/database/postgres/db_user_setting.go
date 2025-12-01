package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) LoadUserSettings(ctx context.Context, userId int, out *database.TblUserSettings) error {
	query := `
		SELECT * FROM PON.USER_SETTINGS tbl
		WHERE tbl.USER_ID = $1
	`
	return db.GetContext(ctx, out, query, userId)

}

func (db *PGDatabase) AddUserSetting(ctx context.Context, settings *database.TblUserSettings) (int, error) {
	query := `
		INSERT INTO PON.USER_SETTINGS (
		USER_ID, 
		DARK_MODE, 
		SHOW_DIABETES, 
		CALORIC_CALC_METHOD, 
		INSULIN_SENSITIVITY_FACTOR
		)
		VALUES (
			:user_id
			:dark_mode
			:show_diabetes
			:caloric_calc_method
			:insulin_sensitivity_factor
		);
	`

	id, err := db.InsertOneNamedGetID(ctx, query, settings)

	return id, err
}

func (db *PGDatabase) AddUserSettingTx(tx *sqlx.Tx, settings *database.TblUserSettings) (int, error) {
	query := `
		INSERT INTO PON.USER_SETTINGS (
		USER_ID, 
		DARK_MODE, 
		SHOW_DIABETES, 
		CALORIC_CALC_METHOD, 
		INSULIN_SENSITIVITY_FACTOR
		)
		VALUES (
			:user_id,
			:dark_mode,
			:show_diabetes,
			:caloric_calc_method,
			:insulin_sensitivity_factor
		);
	`

	id, err := db.InsertOneNamedGetIDTx(tx, query, settings)

	return id, err
}
