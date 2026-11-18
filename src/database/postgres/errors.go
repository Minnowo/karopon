package postgres

import (
	"errors"
	"fmt"
	"karopon/src/database"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// https://www.postgresql.org/docs/17/errcodes-appendix.html

type PGErrorCode string

var (
	PGErrorUndefinedTable      PGErrorCode = "42P01"
	PGErrorForeignKeyViolation PGErrorCode = "23503"
	PGErrorUniqueViolation     PGErrorCode = "23505"
)

// Is reports whether err, or an error it wraps, is a PostgreSQL error with code c.
func (c PGErrorCode) Is(err error) bool {

	var pgErr *pgconn.PgError

	if !errors.As(err, &pgErr) {
		return false
	}

	if pgErr.Code == string(c) {
		return true
	}

	return false
}

// alreadyExists wraps err with database.ErrAlreadyExists when it is a unique
// violation (SQLSTATE 23505, https://www.postgresql.org/docs/17/errcodes-appendix.html)
// on a UNIQUE constraint; any other error, including nil, is returned unchanged.
// 23505 also covers primary keys (default name "<table>_pkey"); those are left
// alone because a clash there is a server fault, not a duplicate the user made.
func alreadyExists(err error) error {

	var pgErr *pgconn.PgError

	if !errors.As(err, &pgErr) || pgErr.Code != string(PGErrorUniqueViolation) {
		return err
	}

	if strings.HasSuffix(pgErr.ConstraintName, "_pkey") {
		return err
	}

	return fmt.Errorf("%w: %w", database.ErrAlreadyExists, err)
}
