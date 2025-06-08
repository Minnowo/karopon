package postgres

import "github.com/jackc/pgx/v5/pgconn"

// https://www.postgresql.org/docs/17/errcodes-appendix.html

type PGErrorCode string

var (
	PGErrorUndefinedTable      PGErrorCode = "42P01"
	PGErrorForeignKeyViolation PGErrorCode = "23503"
)

func (c PGErrorCode) Is(err error) bool {

	pgErr, ok := err.(*pgconn.PgError)

	if !ok {
		return false
	}

	if pgErr.Code == string(c) {
		return true
	}
	return false
}

func GetPGErrorCode(err error) (string, bool) {

	pgErr, ok := err.(*pgconn.PgError)

	if !ok {
		return "", false
	}
	return pgErr.Code, true
}
