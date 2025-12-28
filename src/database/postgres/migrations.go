package postgres

import (
	"context"
	"fmt"
	"karopon/src/database"
)

var postgresUpMigrations = []database.Migration{
	database.NewFileMigration(database.VERSION_NONE, 0, "pg/0001_system"),
	database.NewFileMigration(0, 1, "pg/0002_allow_null_user_food_food_id"),
	database.NewFileMigration(1, 2, "pg/0003_settings_table"),
	database.NewFileMigration(2, 3, "pg/0004_settings_add_cols"),
	database.NewFileMigration(3, 4, "pg/0005_more_settings"),
	database.NewFileMigration(4, 5, "pg/0006_add_more_tables"),
	database.NewFileMigration(5, 6, "pg/0007_3rd_party_database"),
}

func (db *PGDatabase) GetMigrationMaxVersion() database.Version {

	last := len(postgresUpMigrations) - 1

	return postgresUpMigrations[last].ToVersion
}

func (db *PGDatabase) Migrate(ctx context.Context) error {

	version, err := db.GetVersion(ctx)

	if err != nil {

		if PGErrorUndefinedTable.Is(err) {
			version = database.VERSION_NONE
		} else {
			return err
		}
	}

	if version == database.VERSION_UNKNOWN {
		return fmt.Errorf("The database version is unknown, an existing schema exists, but there is no version number: %w", database.ErrInvalidDatabaseVersion)
	}

	if version > db.GetMigrationMaxVersion() {
		return fmt.Errorf("The database version is larger than the maximum migration version: %w", database.ErrInvalidDatabaseVersion)
	}

	db.version = version

	newVersion, err := database.RunUpMigrations(ctx, db, database.Version(version), postgresUpMigrations)

	// should be used even if an error happens
	db.version = newVersion

	if err != nil {
		return err
	}

	return nil
}
