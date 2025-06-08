package postgres

import (
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

type PGDatabase struct {
	database.SQLxDB
	version database.Version
}

func (db *PGDatabase) DBx() *sqlx.DB {
	return db.DB
}
