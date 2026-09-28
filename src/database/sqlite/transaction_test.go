package sqlite

import (
	"context"
	"path"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

// TestWithTxReadSnapshot checks that a write committed by another connection
// between two reads is not seen by the second read.
func TestWithTxReadSnapshot(t *testing.T) {

	ctx := t.Context()

	// A file, since WAL (set when opening) does not apply to :memory:.
	db, err := OpenSqliteDatabase(ctx, path.Join(t.TempDir(), "db.sqlite"))
	require.NoError(t, err)

	_, err = db.ExecContext(ctx, `CREATE TABLE T (ID INTEGER)`)
	require.NoError(t, err)

	count := func(q sqlx.QueryerContext) int {
		var n int
		require.NoError(t, sqlx.GetContext(ctx, q, &n, `SELECT COUNT(*) FROM T`))

		return n
	}

	// The transaction holds one pooled connection, so this runs on another.
	insert := func(ctx context.Context) {
		_, err := db.ExecContext(ctx, `INSERT INTO T (ID) VALUES (1)`)
		require.NoError(t, err)
	}

	t.Run("no transaction sees the write", func(t *testing.T) {
		before := count(db)
		insert(ctx)
		assert.Equal(t, before+1, count(db))
	})

	t.Run("WithTxRead does not see the write", func(t *testing.T) {
		before := count(db)

		err := db.WithTxRead(ctx, func(tx *sqlx.Tx) error {
			first := count(tx)
			insert(ctx)
			assert.Equal(t, first, count(tx))

			return nil
		})
		require.NoError(t, err)

		assert.Equal(t, before+1, count(db))
	})

	t.Run("the snapshot starts at the first read, not at BEGIN", func(t *testing.T) {
		before := count(db)

		err := db.WithTxRead(ctx, func(tx *sqlx.Tx) error {
			insert(ctx)
			assert.Equal(t, before+1, count(tx))

			return nil
		})
		require.NoError(t, err)
	})
}
