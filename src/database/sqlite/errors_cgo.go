//go:build cgo

package sqlite

import (
	"errors"
	"strings"

	sqlite3 "github.com/mattn/go-sqlite3"
)

var (
	SQLiteErrorNoSuchTable SQLiteErrorCode = "no such table"
)

func (e SQLiteErrorCode) Is(err error) bool {

	if err != nil {
		if sqliteErr, ok := err.(sqlite3.Error); ok {
			if strings.Contains(sqliteErr.Error(), string(e)) {
				return true
			}
		}
	}

	return false
}

// isUniqueViolation reports whether err is SQLITE_CONSTRAINT_UNIQUE (2067,
// https://www.sqlite.org/rescode.html) from mattn/go-sqlite3.
func isUniqueViolation(err error) bool {

	var sqliteErr sqlite3.Error

	if !errors.As(err, &sqliteErr) {
		return false
	}

	return sqliteErr.ExtendedCode == sqlite3.ErrConstraintUnique
}
