package database

import (
	"errors"
)

var (
	ErrInvalidDatabaseVersion = errors.New("database version is invalid")
)
