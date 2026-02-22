//go:build cgo
// +build cgo

package sqlite

import (
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
