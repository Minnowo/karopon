package database_test

import (
	"karopon/src/database"
	"karopon/src/database/sqlite"
	"path"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

func TestDB_Sqlite(t *testing.T) {

	runDbTests(t, func(t *testing.T) database.DB {

		dir := t.TempDir()
		str := path.Join(dir, "db.sqlite")
		conn, err := sqlite.OpenSqliteDatabase(t.Context(), str)
		require.NoError(t, err)
		require.NotNil(t, conn)

		err = conn.Migrate(t.Context())
		require.NoError(t, err)

		tbls := []string{
			"PON_DATA_SOURCE",
			"PON_DATA_SOURCE_FOOD",
			"PON_USER",
			"PON_USER_BODYLOG",
			"PON_USER_DASHBOARD",
			"PON_USER_EVENT",
			"PON_USER_EVENTLOG",
			"PON_USER_EVENTLOG_PHOTO",
			"PON_USER_FOOD",
			"PON_USER_FOODLOG",
			"PON_USER_GOAL",
			// "PON_USER_MEDICATION",
			// "PON_USER_MEDICATION_SCHEDULE",
			// "PON_USER_MEDICATIONLOG",
			"PON_USER_PHOTO",
			"PON_USER_SESSION",
			"PON_USER_TAG",
			"PON_USER_TIMESPAN",
			"PON_USER_TIMESPAN_TAG",
		}

		err = conn.WithTx(t.Context(), func(tx *sqlx.Tx) error {

			_, err = tx.Exec("PRAGMA foreign_keys = OFF")
			if err != nil {
				return err
			}

			// Delete all rows from each table
			for _, tbl := range tbls {

				_, err := conn.Exec("DELETE FROM " + tbl)

				if err != nil {
					return err
				}
			}

			// Reset auto-increment counters by updating the sqlite_sequence table
			// This will reset the auto-increment counter for all tables that have one
			for _, tbl := range tbls {
				_, err := conn.Exec("UPDATE sqlite_sequence SET seq = 0 WHERE name = '" + tbl + "'")

				if err != nil {
					return err
				}
			}

			return nil
		})
		require.NoError(t, err)

		_, err = conn.Exec("PRAGMA foreign_keys = ON")
		require.NoError(t, err)

		return conn
	})
}
