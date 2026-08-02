package database_test

import (
	"context"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/postgres"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/stretchr/testify/require"
)

func TestDB_Postgres(t *testing.T) {

	// TEST_POSTGRES_DSN="user=postgres password=postgres_test port=9432 host=localhost sslmode=disable"
	dsn := os.Getenv("TEST_POSTGRES_DSN")

	if dsn == "" {
		t.Skip("TEST_POSTGRES_DSN not set; skipping postgres tests")
	}

	require.NotContains(
		t,
		dsn,
		"dbname=",
		"The POSTGRES_DSN must not contain any dbname parameter, and the default 'postgres' database must exist.",
	)

	// we will create a new database to run all the tests, so we can use a single instance of postgres accross many
	// tests.
	testDbName := strings.ToLower(fmt.Sprintf("TestDB_Postgres_%d", time.Now().UnixMilli()))

	contDSN := dsn + " dbname=postgres"
	testDSN := dsn + " dbname=" + testDbName

	ctx := t.Context()
	controlConn, err := postgres.OpenPGDatabase(ctx, contDSN)
	require.NoError(t, err)
	require.NotNil(t, controlConn)

	// Create fresh database
	_, err = controlConn.ExecContext(ctx, "CREATE DATABASE "+testDbName)
	require.NoError(t, err)

	conn, err := postgres.OpenPGDatabase(ctx, testDSN)
	require.NoError(t, err)
	require.NotNil(t, conn)

	err = conn.Migrate(ctx)
	require.NoError(t, err)

	t.Cleanup(func() {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := conn.Close(); err != nil {
			log.Error().Err(err).Msg("cleanup: conn.Close")
		}

		_, err := controlConn.ExecContext(
			cleanupCtx,
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
			testDbName,
		)
		if err != nil {
			log.Error().Err(err).Msg("cleanup: terminate backends")
		}

		_, err = controlConn.ExecContext(cleanupCtx, `DROP DATABASE "`+testDbName+`"`)
		if err != nil {
			log.Error().Err(err).Msg("cleanup: drop database")
		}

		if err := controlConn.Close(); err != nil {
			log.Error().Err(err).Msg("cleanup: controlConn.Close")
		}
	})

	runDbTests(t, func(t *testing.T) database.DB {

		tbls := []string{
			"pon.data_source",
			"pon.data_source_food",
			"pon.user",
			"pon.user_bodylog",
			"pon.user_dashboard",
			"pon.user_event",
			"pon.user_eventlog",
			"pon.user_eventlog_photo",
			"pon.user_food",
			"pon.user_foodlog",
			"pon.user_goal",
			"pon.user_medication",
			"pon.user_medication_schedule",
			"pon.user_medicationlog",
			"pon.user_photo",
			"pon.user_session",
			"pon.user_tag",
			"pon.user_timespan",
			"pon.user_timespan_tag",
		}

		query := `TRUNCATE ` + strings.Join(tbls, ",") + ` RESTART IDENTITY CASCADE`

		_, err = conn.ExecContext(t.Context(), query)

		require.NoError(t, err)

		return conn
	})
}
