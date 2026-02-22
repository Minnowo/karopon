package sqlite

import (
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

type SqliteDatabase struct {
	database.SQLxDB
	version database.Version
}

func (db *SqliteDatabase) DBx() *sqlx.DB {
	return db.DB
}
