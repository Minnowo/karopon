package postgres

import (
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

type PGDatabase struct {
	database.SQLxDB
	version database.Version
}

func (db *PGDatabase) DBx() *sqlx.DB {
	return db.DB
}
