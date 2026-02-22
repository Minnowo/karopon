package database

import (
	"karopon/src/database"
	"karopon/src/database/sqlite"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDB_SqliteGetVersion(t *testing.T) {

	str := ":memory:"
	conn, err := sqlite.OpenSqliteDatabase(t.Context(), str)
	require.NoError(t, err)
	require.NotNil(t, conn)

	err = conn.Migrate(t.Context())
	require.NoError(t, err)

	var config database.TblConfig

	err = conn.Get(&config, "SELECT * FROM PON_CONFIG")

	require.NoError(t, err)

}
