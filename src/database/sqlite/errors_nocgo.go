//go:build !cgo
// +build !cgo

package sqlite

import (
	"errors"
	"strings"

	sqlite3 "modernc.org/sqlite"
	sqlite3lib "modernc.org/sqlite/lib"
)

var (
	SQLiteErrorNoSuchTable SQLiteErrorCode = "no such table"
)

func (e SQLiteErrorCode) Is(err error) bool {
	if err != nil {
		if sqliteErr, ok := err.(*sqlite3.Error); ok {
			if strings.Contains(sqliteErr.Error(), string(e)) {
				return true
			}
		}
	}

	return false
}

// isUniqueViolation reports whether err is SQLITE_CONSTRAINT_UNIQUE (2067,
// https://www.sqlite.org/rescode.html) from modernc.org/sqlite.
func isUniqueViolation(err error) bool {

	var sqliteErr *sqlite3.Error

	if !errors.As(err, &sqliteErr) {
		return false
	}

	return sqliteErr.Code() == sqlite3lib.SQLITE_CONSTRAINT_UNIQUE
}
