//go:build cgo

package sqlite

import (
	"context"

	_ "github.com/mattn/go-sqlite3"
	"github.com/rs/zerolog/log"
)

func OpenSqliteDatabase(ctx context.Context, connString string) (*SqliteDatabase, error) {
	log.Info().Msg("Using CGO Sqlite build")
	return openSqliteDatabase(ctx, "sqlite3", connString)
}
