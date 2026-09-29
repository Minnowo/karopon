//go:build cgo

package sqlite

import (
	"context"
	"database/sql"

	"github.com/mattn/go-sqlite3"
	"github.com/rs/zerolog/log"
)

func init() {
	sql.Register(driverName, &sqlite3.SQLiteDriver{
		ConnectHook: func(conn *sqlite3.SQLiteConn) error {
			_, err := conn.Exec(connectionPragmas, nil)
			return err
		},
	})
}

func OpenSqliteDatabase(ctx context.Context, connString string) (*SqliteDatabase, error) {
	log.Info().Msg("Using CGO Sqlite build")
	return openSqliteDatabase(ctx, driverName, connString)
}
