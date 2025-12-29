package database

import (
	"context"
	"embed"
	"fmt"
	"path"
	"strconv"

	"github.com/jmoiron/sqlx"
	"github.com/minnowo/log4zero"
)

var migrationLogger = log4zero.Get("database-migrations")

//go:embed migrations/*
var migrationFiles embed.FS

type Version int

const (
	VERSION_UNKNOWN Version = -2
	VERSION_NONE    Version = -1
)

func (v Version) String() string {
	return strconv.Itoa(int(v))
}

type MigrationFunc func(ctx context.Context, db DB, mode string) error

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

	return NewFuncMigration(fromVersion, toVersion, func(ctx context.Context, db DB, mode string) error {

		return db.WithTx(ctx, func(tx *sqlx.Tx) error {

			migrationSQL, err := migrationFiles.ReadFile(path.Join("migrations", filename+"."+mode+".sql"))

			if err != nil {
				return fmt.Errorf("failed to read migration file: %w", err)
			}

			if _, err := tx.Exec(string(migrationSQL)); err != nil {
				return fmt.Errorf("failed to execute migration %s to %s: %w", fromVersion, toVersion, err)
			}

			if err := db.SetVersionTx(tx, toVersion); err != nil {
				return fmt.Errorf("failed to set version during migration %s to %s: %w", fromVersion, toVersion, err)
			}

			return nil
		})
	})
}

func RunUpMigrations(ctx context.Context, db DB, version Version, migrations []Migration) (Version, error) {

	for _, migration := range migrations {

		if version != migration.FromVersion {
			continue
		}

		migrationLogger.Info().
			Int("from", int(migration.FromVersion)).
			Int("to", int(migration.ToVersion)).
			Msg("Migrating database")

		if err := migration.MigrationFunc(ctx, db, "up"); err != nil {
			return version, fmt.Errorf("failed to run migration from %s to %s: %w", migration.FromVersion, migration.ToVersion, err)
		}

		version = migration.ToVersion
	}

	return version, nil
}
