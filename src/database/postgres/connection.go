package postgres

import (
	"context"
	"karopon/src/database"
	"strings"
	"time"

	"github.com/pkg/errors"
	"github.com/vinovest/sqlx"
	"github.com/vinovest/sqlx/reflectx"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func OpenPGDatabase(ctx context.Context, connString string) (pgDB *PGDatabase, err error) {

	conn, err := sqlx.ConnectContext(ctx, "pgx", connString)

	if err != nil {
		return nil, errors.WithStack(err)
	}

	conn.Mapper = reflectx.NewMapperTagColFunc("db", strings.ToUpper, strings.ToUpper, strings.ToUpper)
	conn.SetMaxOpenConns(100)
	conn.SetConnMaxLifetime(time.Second)

	pgDB = &PGDatabase{
		SQLxDB: database.SQLxDB{
			DB: conn,
		},
	}

	return pgDB, err
}
