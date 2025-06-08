package postgres

import (
	"context"
	"karopon/src/database"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func OpenPGDatabase(ctx context.Context, connString string) (pgDB *PGDatabase, err error) {

	db, err := sqlx.ConnectContext(ctx, "pgx", connString)

	if err != nil {
		return nil, errors.WithStack(err)
	}

	db.SetMaxOpenConns(100)
	db.SetConnMaxLifetime(time.Second)

	pgDB = &PGDatabase{
		SQLxDB: database.SQLxDB{
			DB: db,
		},
	}
	return pgDB, err
}
