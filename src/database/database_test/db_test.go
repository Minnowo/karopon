package database_test

import (
	"database/sql"
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

func testDBxAndBase(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	db := newTestDB(t)

	assert.NotNil(t, db.DBx())
	assert.NotNil(t, db.Base())
}

func testWithTxCommits(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return nil
	})
	assert.NoError(t, err)

	err = db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return sql.ErrNoRows
	})
	assert.Error(t, err)
	assert.ErrorIs(t, err, sql.ErrNoRows)

	err = db.WithTx(ctx, func(tx *sqlx.Tx) error {

		err := db.SetVersionTx(tx, database.VERSION_UNKNOWN)
		require.NoError(t, err)

		return sql.ErrNoRows
	})
	assert.Error(t, err)
	assert.ErrorIs(t, err, sql.ErrNoRows)

	// test rolback happened
	version, err := db.GetVersion(ctx)
	assert.NoError(t, err)
	assert.NotEqual(t, database.VERSION_UNKNOWN, version)
}

func testWithTxRead(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	err := db.WithTxRead(ctx, func(tx *sqlx.Tx) error {

		var logs []database.TblUserEventLog

		return db.LoadUserEventLogsTx(tx, userID, &logs)
	})
	assert.NoError(t, err)

	err = db.WithTxRead(ctx, func(tx *sqlx.Tx) error {
		return sql.ErrNoRows
	})
	assert.ErrorIs(t, err, sql.ErrNoRows)
}
