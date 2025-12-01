package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) AddUser(ctx context.Context, user *database.TblUser) (int, error) {
	var retUserId int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {
		query := `
    	    INSERT INTO PON.USER (NAME, PASSWORD)
    	    VALUES (:name, :password)
    	    RETURNING ID;
    	`

		id, err := db.InsertOneNamedGetIDTx(tx, query, user)
		if err != nil {
			return err
		}

		retUserId = id

		var userSettings database.TblUserSettings
		userSettings.UserID = id
		userSettings.DarkMode = true
		userSettings.ShowDiabetes = true
		userSettings.CaloricCalcMethod = "auto"
		userSettings.InsulinSensitivityFactor = 0.01

		settingsId, err := db.AddUserSettingTx(tx, &userSettings)
		if err != nil {
			return err
		}

		userSettings.ID = settingsId

		return nil
	})

	return retUserId, err
}

func (db *PGDatabase) LoadUser(ctx context.Context, username string, user *database.TblUser) error {

	query := `SELECT ID, NAME, PASSWORD, CREATED FROM PON.USER WHERE NAME = $1 LIMIT 1`

	err := db.GetContext(ctx, user, query, username)

	if err != nil {
		return err
	}

	return nil
}

func (db *PGDatabase) LoadUsers(ctx context.Context, users *[]database.TblUser) error {
	query := `
	SELECT * FROM PON.USER fl
	`

	return db.SelectContext(ctx, users, query)
}
