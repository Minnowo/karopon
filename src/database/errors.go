package database

import "fmt"

var (
	ErrInvalidDatabaseVersion = fmt.Errorf("database version is invalid")
)
