package postgres

import (
	"os"
	"sync"
	"testing"

	"karopon/src/database"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// pgMigrationLock serialises all PG migration tests against one another since they share
// a single database instance and mutate the schema between runs.
var pgMigrationLock sync.Mutex

// openAndResetPGDB opens a PG connection, drops the pon schema entirely for a clean slate,
// and registers the lock-release as a test cleanup function.
// Tests are skipped when POSTGRES_MIGRATION_TEST_DSN is not set.
func openAndResetPGDB(t *testing.T) *PGDatabase {
	t.Helper()

	// This DSN should be a different postgres instance that the one in the database_test package, or at least should
	// not be run at the same time.
	// POSTGRES_MIGRATION_TEST_DSN="user=postgres password=postgres_migration_test port=9431 host=localhost
	// sslmode=disable"
	dsn := os.Getenv("POSTGRES_MIGRATION_TEST_DSN")
	if dsn == "" {
		t.Skip("POSTGRES_DSN not set; skipping postgres migration tests")
	}

	pgMigrationLock.Lock()
	t.Cleanup(pgMigrationLock.Unlock)

	ctx := t.Context()
	conn, err := OpenPGDatabase(ctx, dsn)
	require.NoError(t, err)

	_, err = conn.ExecContext(ctx, `DROP SCHEMA IF EXISTS pon CASCADE`)
	require.NoError(t, err)

	return conn
}

// TestPostgresMigrations runs each migration in order on a single shared database.
// Each subtest applies exactly one migration step and validates the resulting schema change.
// State (inserted IDs, etc.) is shared across subtests so later tests build on earlier ones.
// To add a test for a new migration, append a new t.Run block at the bottom.
func TestPostgresMigrations(t *testing.T) {
	ctx := t.Context()
	conn := openAndResetPGDB(t)

	var (
		userID       int
		lightUserID  int
		sessionToken []byte
	)

	// 0001_system: VERSION_NONE → 0
	// Creates the pon schema and all core tables (user, user_event, user_eventlog, user_food, user_foodlog).
	t.Run("0001_system", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, postgresUpMigrations[0:1])
		require.NoError(t, err)

		ver, err := conn.GetVersion(ctx)
		require.NoError(t, err)
		assert.Equal(t, database.Version(0), ver)

		// Insert a minimal user (v0 schema: only id, name, password, created).
		require.NoError(t, conn.QueryRowContext(ctx,
			`INSERT INTO pon.user (name, password) VALUES ('alice', '\x010203') RETURNING id`,
		).Scan(&userID))
		require.NotZero(t, userID)
	})

	// 0002_allow_null_user_food_food_id: 0 → 1
	// Drops the NOT NULL constraint on user_foodlog.food_id and adds ON DELETE SET NULL.
	t.Run("0002_allow_null_user_food_food_id", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 0, postgresUpMigrations[1:2])
		require.NoError(t, err)

		// NULL food_id must now be accepted.
		var foodlogID int
		require.NoError(t, conn.QueryRowContext(ctx, `
			INSERT INTO pon.user_foodlog
				(user_id, food_id, user_time, name, event, unit, portion, protein, carb, fibre, fat)
			VALUES ($1, NULL, NOW(), 'NullFoodTest', 'Breakfast', 'g', 100, 10, 5, 2, 3)
			RETURNING id`, userID,
		).Scan(&foodlogID), "null food_id should be allowed after migration")

		// Clean up so this orphan row doesn't interfere with later migration tests.
		_, err = conn.ExecContext(ctx, `DELETE FROM pon.user_foodlog WHERE id = $1`, foodlogID)
		require.NoError(t, err)
	})

	// 0003_settings_table: 1 → 2
	// Creates pon.user_settings and inserts default rows for all existing users.
	t.Run("0003_settings_table", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 1, postgresUpMigrations[2:3])
		require.NoError(t, err)

		// alice must have a row in user_settings (inserted by the migration).
		var count int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM pon.user_settings WHERE user_id = $1`, userID,
		).Scan(&count))
		assert.Equal(t, 1, count, "migration should have inserted a settings row for alice")
	})

	// 0004_settings_add_cols: 2 → 3
	// Adds settings columns directly to pon.user (dark_mode, show_diabetes, etc.) and drops user_settings.
	t.Run("0004_settings_add_cols", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 2, postgresUpMigrations[3:4])
		require.NoError(t, err)

		// Settings columns must exist on the user table with their defaults.
		var darkMode bool
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT dark_mode FROM pon.user WHERE id = $1`, userID,
		).Scan(&darkMode))
		assert.True(t, darkMode, "dark_mode should default to TRUE")

		// user_settings table must be dropped.
		var tableExists bool
		require.NoError(t, conn.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = 'pon' AND table_name = 'user_settings'
			)`).Scan(&tableExists))
		assert.False(t, tableExists, "user_settings table should be dropped")
	})

	// 0005_more_settings: 3 → 4
	// Adds session_expire_time_seconds, time_format, date_format to pon.user.
	t.Run("0005_more_settings", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 3, postgresUpMigrations[4:5])
		require.NoError(t, err)

		// Pre-existing user row must have the default value for session_expire_time_seconds.
		var sessionExpire int64
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT session_expire_time_seconds FROM pon.user WHERE id = $1`, userID,
		).Scan(&sessionExpire))
		assert.Equal(t, int64(60*60*24), sessionExpire)
	})

	// 0006_add_more_tables: 4 → 5
	// Creates user_bodylog, user_medication, user_medication_schedule, user_medicationlog.
	t.Run("0006_add_more_tables", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 4, postgresUpMigrations[5:6])
		require.NoError(t, err)

		// user_bodylog must exist and accept inserts.
		var bodylogID int
		require.NoError(t, conn.QueryRowContext(ctx,
			`INSERT INTO pon.user_bodylog (user_id, user_time, weight_kg) VALUES ($1, NOW(), 75.5) RETURNING id`,
			userID,
		).Scan(&bodylogID))
		require.NotZero(t, bodylogID)
	})

	// 0007_3rd_party_database: 5 → 6
	// Creates data_source and data_source_food tables with trigram index.
	t.Run("0007_3rd_party_database", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 5, postgresUpMigrations[6:7])
		require.NoError(t, err)

		// data_source must exist and accept inserts.
		var dsID int
		require.NoError(t, conn.QueryRowContext(ctx,
			`INSERT INTO pon.data_source (name, url) VALUES ('USDA', 'https://example.com') RETURNING id`,
		).Scan(&dsID))
		require.NotZero(t, dsID)
	})

	// 0008_goals_table: 6 → 7
	// Creates pon.user_goal.
	// NOTE: uses the pre-rename value 'MORE_THAN' — 0009 will verify it gets renamed.
	t.Run("0008_goals_table", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 6, postgresUpMigrations[7:8])
		require.NoError(t, err)

		// user_goal must exist; insert using the old comparison value that 0009 will rename.
		var goalID int
		require.NoError(t, conn.QueryRowContext(ctx, `
			INSERT INTO pon.user_goal
				(user_id, name, target_value, target_col, aggregation_type, value_comparison, time_expr)
			VALUES ($1, 'Daily Weight', 70, 'weight_kg', 'AVG', 'MORE_THAN', 'DAILY')
			RETURNING id`, userID,
		).Scan(&goalID))
		require.NotZero(t, goalID)
	})

	// 0009_goals_rename_comparison: 7 → 8
	// Renames MORE_THAN → GREATER_THAN and MORE_THAN_OR_EQUAL_TO → GREATER_THAN_OR_EQUAL_TO
	// in all existing user_goal rows.
	t.Run("0009_goals_rename_comparison", func(t *testing.T) {
		// Insert a second goal with 'MORE_THAN_OR_EQUAL_TO' before migration.
		var goalGteID int
		require.NoError(t, conn.QueryRowContext(ctx, `
			INSERT INTO pon.user_goal
				(user_id, name, target_value, target_col, aggregation_type, value_comparison, time_expr)
			VALUES ($1, 'Weekly Protein', 150, 'protein', 'SUM', 'MORE_THAN_OR_EQUAL_TO', 'WEEKLY')
			RETURNING id`, userID,
		).Scan(&goalGteID))

		_, err := database.RunUpMigrations(ctx, conn, 7, postgresUpMigrations[8:9])
		require.NoError(t, err)

		// 'Daily Weight' had MORE_THAN → must be GREATER_THAN.
		var comp1 string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT value_comparison FROM pon.user_goal WHERE name = 'Daily Weight'`,
		).Scan(&comp1))
		assert.Equal(t, "GREATER_THAN", comp1)

		// 'Weekly Protein' had MORE_THAN_OR_EQUAL_TO → must be GREATER_THAN_OR_EQUAL_TO.
		var comp2 string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT value_comparison FROM pon.user_goal WHERE id = $1`, goalGteID,
		).Scan(&comp2))
		assert.Equal(t, "GREATER_THAN_OR_EQUAL_TO", comp2)
	})

	// 0010_timespans: 8 → 9
	// Creates user_tag, user_timespan, and user_timespan_tag tables.
	t.Run("0010_timespans", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 8, postgresUpMigrations[9:10])
		require.NoError(t, err)

		// user_tag must exist and accept inserts.
		var tagID int
		require.NoError(t, conn.QueryRowContext(ctx,
			`INSERT INTO pon.user_tag (user_id, namespace, name) VALUES ($1, 'food', 'Egg') RETURNING id`,
			userID,
		).Scan(&tagID))
		require.NotZero(t, tagID)
	})

	// 0011_user_session: 9 → 10
	// Creates pon.user_session.
	// NOTE: session inserted here (no USER_AGENT column yet) is used in 0013 to verify the default.
	t.Run("0011_user_session", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 9, postgresUpMigrations[10:11])
		require.NoError(t, err)

		// user_session must exist; insert a session to be verified in 0013.
		sessionToken = make([]byte, 32)
		_, err = conn.ExecContext(ctx,
			`INSERT INTO pon.user_session (user_id, expires, token) VALUES ($1, NOW() + INTERVAL '1 hour', $2)`,
			userID, sessionToken)
		require.NoError(t, err)
	})

	// 0012_user_theme_change: 10 → 11
	// Converts dark_mode BOOLEAN → theme VARCHAR, mapping TRUE → 'dark-1' and FALSE → 'light-1'.
	t.Run("0012_user_theme_change", func(t *testing.T) {
		// Insert a second user with DARK_MODE = FALSE before migration to verify 'light-1' mapping.
		require.NoError(t, conn.QueryRowContext(ctx,
			`INSERT INTO pon.user (name, password, dark_mode) VALUES ('bob', '\x040506', FALSE) RETURNING id`,
		).Scan(&lightUserID))

		_, err := database.RunUpMigrations(ctx, conn, 10, postgresUpMigrations[11:12])
		require.NoError(t, err)

		// alice (DARK_MODE = TRUE) → theme must be 'dark-1'.
		var aliceTheme string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT theme FROM pon.user WHERE id = $1`, userID,
		).Scan(&aliceTheme))
		assert.Equal(t, "dark-1", aliceTheme)

		// bob (DARK_MODE = FALSE) → theme must be 'light-1'.
		var bobTheme string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT theme FROM pon.user WHERE id = $1`, lightUserID,
		).Scan(&bobTheme))
		assert.Equal(t, "light-1", bobTheme)
	})

	// 0013_session_user_agent: 11 → 12
	// Adds user_agent VARCHAR(512) NOT NULL DEFAULT '' to pon.user_session.
	t.Run("0013_session_user_agent", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 11, postgresUpMigrations[12:13])
		require.NoError(t, err)

		// Session inserted in 0011 (before USER_AGENT column existed) must default to ''.
		var userAgent string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT user_agent FROM pon.user_session WHERE user_id = $1 AND token = $2`,
			userID, sessionToken,
		).Scan(&userAgent))
		assert.Equal(t, "", userAgent)
	})

	// 0014_foodlog_eventlog_delete_cascade: 12 → 13
	// Deletes user_foodlog rows with NULL eventlog_id and adds ON DELETE CASCADE on that FK.
	t.Run("0014_foodlog_eventlog_delete_cascade", func(t *testing.T) {
		// Insert event and eventlog to anchor a valid foodlog.
		var eventID int
		require.NoError(t, conn.QueryRowContext(ctx,
			`INSERT INTO pon.user_event (user_id, name) VALUES ($1, 'Dinner') RETURNING id`, userID,
		).Scan(&eventID))

		var eventlogID int
		require.NoError(t, conn.QueryRowContext(ctx, `
			INSERT INTO pon.user_eventlog
				(user_id, event_id, user_time, event,
				 net_carbs, blood_glucose, insulin_sensitivity_factor,
				 insulin_to_carb_ratio, blood_glucose_target,
				 recommended_insulin_amount, actual_insulin_taken)
			VALUES ($1, $2, NOW(), 'Dinner', 0, 0, 0, 0, 0, 0, 0)
			RETURNING id`, userID, eventID,
		).Scan(&eventlogID))

		// Foodlog with valid eventlog_id — must survive the migration.
		_, err := conn.ExecContext(ctx, `
			INSERT INTO pon.user_foodlog
				(user_id, eventlog_id, user_time, name, event, unit, portion, protein, carb, fibre, fat)
			VALUES ($1, $2, NOW(), 'Egg', 'Dinner', 'g', 100, 13, 1, 0, 11)`,
			userID, eventlogID)
		require.NoError(t, err)

		// Foodlog with NULL eventlog_id — must be deleted by the migration.
		_, err = conn.ExecContext(ctx, `
			INSERT INTO pon.user_foodlog
				(user_id, eventlog_id, user_time, name, event, unit, portion, protein, carb, fibre, fat)
			VALUES ($1, NULL, NOW(), 'Toast', 'Dinner', 'g', 50, 4, 15, 2, 1)`,
			userID)
		require.NoError(t, err)

		_, err = database.RunUpMigrations(ctx, conn, 12, postgresUpMigrations[13:14])
		require.NoError(t, err)

		var count int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM pon.user_foodlog`).Scan(&count))
		assert.Equal(t, 1, count, "only the foodlog with eventlog_id should survive")

		var name string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT name FROM pon.user_foodlog`).Scan(&name))
		assert.Equal(t, "Egg", name)

		// Verify ON DELETE CASCADE: deleting the eventlog must also delete its foodlog.
		require.NoError(t, conn.DeleteUserEventLog(ctx, userID, eventlogID))

		var afterCascade int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM pon.user_foodlog WHERE eventlog_id = $1`, eventlogID,
		).Scan(&afterCascade))
		assert.Equal(t, 0, afterCascade, "foodlog should be cascade-deleted with its eventlog")
	})

	// 0015_event_log_trailing_rows: 13 → 14
	// Adds event_log_trailing_rows INTEGER NOT NULL DEFAULT 3 to pon.user.
	t.Run("0015_event_log_trailing_rows", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 13, postgresUpMigrations[14:15])
		require.NoError(t, err)

		// Pre-existing user rows must have the column default value of 3.
		var trailing int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT event_log_trailing_rows FROM pon.user WHERE id = $1`, userID,
		).Scan(&trailing))
		assert.Equal(t, 3, trailing)
	})
}
