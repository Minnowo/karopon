package sqlite

import (
	"context"
	"fmt"
	"karopon/src/database"
)

var sqliteUpMigrations = []database.Migration{
	database.NewFileMigration(database.VERSION_NONE, 0, "sqlite/0001_system"),
	database.NewFileMigration(0, 1, "sqlite/0002_session_user_agent"),
	database.NewFileMigration(1, 2, "sqlite/0003_foodlog_eventlog_delete_cascade"),
	database.NewFileMigration(2, 3, "sqlite/0004_event_log_trailing_rows"),
	database.NewFileMigration(3, 4, "sqlite/0005_day_time_offset"),
	database.NewFileMigration(4, 5, "sqlite/0006_dashboard"),
}

func (db *SqliteDatabase) GetMigrationMaxVersion() database.Version {

	last := len(sqliteUpMigrations) - 1

	return sqliteUpMigrations[last].ToVersion
}

func (db *SqliteDatabase) Migrate(ctx context.Context) error {

	version, err := db.GetVersion(ctx)

	if err != nil {

		if SQLiteErrorNoSuchTable.Is(err) {
			version = database.VERSION_NONE
		} else {
			return err
		}
	}

	if version == database.VERSION_UNKNOWN {
		return fmt.Errorf(
			"the database version is unknown, an existing schema exists, but there is no version number: %w",
			database.ErrInvalidDatabaseVersion,
		)
	}

	if version > db.GetMigrationMaxVersion() {
		return fmt.Errorf(
			"the database version is larger than the maximum migration version: %w",
			database.ErrInvalidDatabaseVersion,
		)
	}

	db.version = version

	newVersion, err := database.RunUpMigrations(ctx, db, database.Version(version), sqliteUpMigrations)

	// should be used even if an error happens
	db.version = newVersion

	if err != nil {
		return err
	}

	return nil
}
