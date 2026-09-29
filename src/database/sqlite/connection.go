package sqlite

import (
	"context"
	"karopon/src/database"
	"strings"
	"time"

	"github.com/pkg/errors"
	"github.com/vinovest/sqlx"
	"github.com/vinovest/sqlx/reflectx"
)

const driverName = "karopon_sqlite"

// connectionPragmas are run on every new connection in the pool.
const connectionPragmas = "PRAGMA foreign_keys = ON;"

func init() {
	sqlx.BindDriver(driverName, sqlx.QUESTION)
}

func openSqliteDatabase(ctx context.Context, driver, connString string) (db *SqliteDatabase, err error) {

	conn, err := sqlx.ConnectContext(ctx, driver, connString)

	if err != nil {
		return nil, errors.WithStack(err)
	}

	conn.Mapper = reflectx.NewMapperTagColFunc("db", strings.ToUpper, strings.ToUpper, strings.ToUpper)
	conn.SetMaxOpenConns(5)
	conn.SetConnMaxLifetime(time.Minute * 10)

	_, err = conn.Exec("PRAGMA journal_mode = WAL;")
	if err != nil {
		return nil, errors.WithStack(err)
	}

	db = &SqliteDatabase{
		SQLxDB: database.SQLxDB{
			DB: conn,
		},
	}

	return db, err
}
