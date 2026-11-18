package sqlite

import (
	"fmt"
	"karopon/src/database"
)

type SQLiteErrorCode string

// alreadyExists wraps err with database.ErrAlreadyExists when it is a UNIQUE
// constraint failure; any other error, including nil, is returned unchanged.
func alreadyExists(err error) error {

	if isUniqueViolation(err) {
		return fmt.Errorf("%w: %w", database.ErrAlreadyExists, err)
	}

	return err
}
