package sqlite

import (
	"context"
	"fmt"
	"karopon/src/database"
)

var sqliteUpMigrations = []database.Migration{
	database.NewFileMigration(database.VERSION_NONE, 0, "sqlite/0001_system"),
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
		return fmt.Errorf("The database version is unknown, an existing schema exists, but there is no version number: %w", database.ErrInvalidDatabaseVersion)
	}

	if version > db.GetMigrationMaxVersion() {
		return fmt.Errorf("The database version is larger than the maximum migration version: %w", database.ErrInvalidDatabaseVersion)
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
