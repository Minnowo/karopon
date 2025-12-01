package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"karopon/src/database"
)

var postgresMigrations = []database.Migration{
	database.NewFileMigration(database.VERSION_NONE, database.VERSION_0, "pg/0001_system"),
	database.NewFileMigration(database.VERSION_0, database.VERSION_1, "pg/0002_allow_null_user_food_food_id"),
	database.NewFileMigration(database.VERSION_1, database.VERSION_2, "pg/0003_settings_table"),
}

func (db *PGDatabase) Migrate(ctx context.Context) error {

	version, err := db.GetVersion(ctx)

	if err == sql.ErrNoRows {
		return fmt.Errorf("got empty version from database")
	} else if PGErrorUndefinedTable.Is(err) {
		version = -1
	} else if err != nil {
		return err
	}

	db.version = version

	newVersion, err := database.RunMigrations(ctx, db, database.Version(version), postgresMigrations)

	// should be used even if an error happens
	db.version = newVersion

	if err != nil {
		return err
	}

	return nil
}
