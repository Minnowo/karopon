//go:build !cgo
// +build !cgo

package sqlite

import (
	"context"
	"database/sql"

	"github.com/rs/zerolog/log"
	"modernc.org/sqlite"
)

func init() {
	d := &sqlite.Driver{}
	d.RegisterConnectionHook(func(conn sqlite.ExecQuerierContext, _ string) error {
		_, err := conn.ExecContext(context.Background(), connectionPragmas, nil)
		return err
	})
	sql.Register(driverName, d)
}

func OpenSqliteDatabase(ctx context.Context, connString string) (*SqliteDatabase, error) {
	log.Info().Msg("Using Pure Go Sqlite build")
	return openSqliteDatabase(ctx, driverName, connString)
}
