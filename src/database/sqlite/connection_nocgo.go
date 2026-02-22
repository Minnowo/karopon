//go:build !cgo
// +build !cgo

package sqlite

import (
	"context"

	"github.com/rs/zerolog/log"
	_ "modernc.org/sqlite"
)

func OpenSqliteDatabase(ctx context.Context, connString string) (*SqliteDatabase, error) {
	log.Info().Msg("Using Pure Go Sqlite build")
	return openSqliteDatabase(ctx, "sqlite", connString)
}
