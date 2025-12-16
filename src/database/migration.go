package database

import (
	"context"
	"embed"
	"fmt"
	"path"
	"strconv"

	"karopon/src/logging"

	"github.com/jmoiron/sqlx"
)

var migrationLogger = logging.GetLogger("database-migrations")

//go:embed migrations/*
var migrationFiles embed.FS

type Version int

const (
	VERSION_UNKNOWN Version = -2
	VERSION_NONE    Version = -1
	VERSION_0       Version = 0
	VERSION_1       Version = 1
	VERSION_2       Version = 2
	VERSION_3       Version = 3
	VERSION_4       Version = 4
	VERSION_5       Version = 5
)

func (v Version) String() string {
	return strconv.Itoa(int(v))
}
func (v Version) Valid() bool {
	switch v {
	case VERSION_0, VERSION_1, VERSION_2, VERSION_3, VERSION_4, VERSION_5:
		return true
	}
	return false
}

type MigrationFunc func(ctx context.Context, db DB) error

type Migration struct {
	FromVersion   Version
	ToVersion     Version
	MigrationFunc MigrationFunc
}

func NewFuncMigration(fromVersion, toVersion Version, migrationFunc MigrationFunc) Migration {
	return Migration{
		FromVersion:   fromVersion,
		ToVersion:     toVersion,
		MigrationFunc: migrationFunc,
	}
}

func NewFileMigration(fromVersion, toVersion Version, filename string) Migration {

	return NewFuncMigration(fromVersion, toVersion, func(ctx context.Context, db DB) error {

		return db.WithTx(ctx, func(tx *sqlx.Tx) error {

			migrationSQL, err := migrationFiles.ReadFile(path.Join("migrations", filename+".up.sql"))

			if err != nil {
				return fmt.Errorf("failed to read migration file: %w", err)
			}

			if _, err := tx.Exec(string(migrationSQL)); err != nil {
				return fmt.Errorf("failed to execute migration %s to %s: %w", fromVersion, toVersion, err)
			}

			if err := db.SetVersionTx(tx, toVersion); err != nil {
				return fmt.Errorf("failed to execute migration %s to %s: %w", fromVersion, toVersion, err)
			}

			return nil
		})
	})
}

func RunMigrations(ctx context.Context, db DB, version Version, migrations []Migration) (Version, error) {

	migrationLogger.Info().Int("version", int(version)).Msg("Running database migrations")

	defer func(v *Version) {
		migrationLogger.Info().Int("version", int(version)).Msg("Finished database migrations")
	}(&version)

	for _, migration := range migrations {

		if version != migration.FromVersion {
			continue
		}

		migrationLogger.Info().
			Int("from", int(migration.FromVersion)).
			Int("to", int(migration.ToVersion)).
			Msg("Migrating database")

		if err := migration.MigrationFunc(ctx, db); err != nil {
			return version, fmt.Errorf("failed to run migration from %s to %s: %w", migration.FromVersion, migration.ToVersion, err)
		}

		version = migration.ToVersion

		if err := db.SetVersion(ctx, version); err != nil {
			return version, fmt.Errorf("failed to store database version %s from %s to %s: %w", version.String(), migration.FromVersion, migration.ToVersion, err)
		}
	}

	return version, nil
}
