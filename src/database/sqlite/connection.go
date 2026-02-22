package sqlite

import (
	"context"
	"karopon/src/database"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/jmoiron/sqlx/reflectx"
	"github.com/pkg/errors"
)

func openSqliteDatabase(ctx context.Context, driver, connString string) (DB *SqliteDatabase, err error) {

	db, err := sqlx.ConnectContext(ctx, driver, connString)

	if err != nil {
		return nil, errors.WithStack(err)
	}

	db.Mapper = reflectx.NewMapperTagFunc("db", strings.ToUpper, strings.ToUpper)
	db.SetMaxOpenConns(5)
	db.SetConnMaxLifetime(time.Minute * 10)

	_, err = db.Exec("PRAGMA journal_mode = WAL;")
	if err != nil {
		return nil, errors.WithStack(err)
	}

	_, err = db.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		return nil, errors.WithStack(err)
	}

	DB = &SqliteDatabase{
		SQLxDB: database.SQLxDB{
			DB: db,
		},
	}
	return DB, err
}
