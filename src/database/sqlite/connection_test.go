package sqlite

import (
	"path"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestForeignKeysOnEveryConnection checks that foreign_keys is enabled on
// every pooled connection, not just the first one.
func TestForeignKeysOnEveryConnection(t *testing.T) {

	ctx := t.Context()

	db, err := OpenSqliteDatabase(ctx, path.Join(t.TempDir(), "db.sqlite"))
	require.NoError(t, err)

	// Hold several connections at once so the pool has to open new ones.
	for range 5 {
		conn, err := db.Connx(ctx)
		require.NoError(t, err)
		defer conn.Close()

		var fk int
		require.NoError(t, conn.GetContext(ctx, &fk, `PRAGMA foreign_keys`))
		require.Equal(t, 1, fk)
	}
}
