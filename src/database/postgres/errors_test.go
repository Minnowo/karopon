// Tests for mapping PostgreSQL errors to database sentinels in errors.go.

package postgres

import (
	"errors"
	"fmt"
	"karopon/src/database"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
)

var errTestConnReset = errors.New("connection reset")

func TestAlreadyExistsOnlyForUniqueKeys(t *testing.T) {

	unique := &pgconn.PgError{Code: "23505", ConstraintName: "user_food_user_id_name_unit_key"}
	assert.ErrorIs(t, alreadyExists(unique), database.ErrAlreadyExists)
	assert.ErrorIs(t, alreadyExists(fmt.Errorf("insert: %w", unique)), database.ErrAlreadyExists, "wrapped")

	// 23505 also covers primary keys; a clash there (e.g. a drifted sequence) is
	// not a duplicate the user made, so it must stay an ordinary error.
	pkey := &pgconn.PgError{Code: "23505", ConstraintName: "user_food_pkey"}
	assert.NotErrorIs(t, alreadyExists(pkey), database.ErrAlreadyExists)

	other := &pgconn.PgError{Code: "23503", ConstraintName: "user_foodlog_food_id_fkey"}
	assert.NotErrorIs(t, alreadyExists(other), database.ErrAlreadyExists)

	assert.Equal(t, errTestConnReset, alreadyExists(errTestConnReset))
	assert.NoError(t, alreadyExists(nil))
}
