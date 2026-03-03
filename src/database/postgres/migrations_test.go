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
// Tests are skipped when POSTGRES_DSN is not set.
func openAndResetPGDB(t *testing.T) *PGDatabase {
	t.Helper()

	dsn := os.Getenv("POSTGRES_DSN")
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

// TestPostgresMigration_FreshInstall verifies that a brand-new database migrates cleanly to the
// latest version and that the resulting schema is functional.
func TestPostgresMigration_FreshInstall(t *testing.T) {
	ctx := t.Context()
	conn := openAndResetPGDB(t)

	require.NoError(t, conn.Migrate(ctx))

	ver, err := conn.GetVersion(ctx)
	require.NoError(t, err)
	assert.Equal(t, conn.GetMigrationMaxVersion(), ver)

	// Verify the schema is functional by performing a basic insert.
	userID, err := conn.AddUser(ctx, &database.TblUser{Name: "testuser", Password: []byte{1}})
	require.NoError(t, err)
	require.NotZero(t, userID)
}

// TestPostgresMigration_UserThemeRename verifies that migration 10→11
// (0012_user_theme_change) converts the DARK_MODE boolean column to a THEME varchar,
// mapping TRUE → 'dark-1' and FALSE → 'light-1' for existing rows.
func TestPostgresMigration_UserThemeRename(t *testing.T) {
	ctx := t.Context()
	conn := openAndResetPGDB(t)

	// Run migrations VERSION_NONE → 10 (first 11 entries, indices 0-10).
	// After these, pon.user has a DARK_MODE BOOLEAN column.
	_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, postgresUpMigrations[:11])
	require.NoError(t, err)

	// Insert two users using the v10 schema (DARK_MODE BOOLEAN).
	insertUser := `
		INSERT INTO pon.user
			(name, password, dark_mode, show_diabetes, caloric_calc_method,
			 insulin_sensitivity_factor, target_blood_sugar, event_history_fetch_limit,
			 session_expire_time_seconds, time_format, date_format)
		VALUES ($1, '\x010203', $2, TRUE, 'auto', 3, 5.6, 50, 86400, '24-hour', 'auto')
		RETURNING id`

	var darkUserID int
	require.NoError(t, conn.QueryRowContext(ctx, insertUser, "dark_user", true).Scan(&darkUserID))

	var lightUserID int
	require.NoError(t, conn.QueryRowContext(ctx, insertUser, "light_user", false).Scan(&lightUserID))

	// Run remaining migrations (10 → 11 → 12 → 13).
	_, err = database.RunUpMigrations(ctx, conn, 10, postgresUpMigrations[11:])
	require.NoError(t, err)

	var darkTheme, lightTheme string
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT theme FROM pon.user WHERE id = $1`, darkUserID).Scan(&darkTheme))
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT theme FROM pon.user WHERE id = $1`, lightUserID).Scan(&lightTheme))

	assert.Equal(t, "dark-1", darkTheme)
	assert.Equal(t, "light-1", lightTheme)
}

// TestPostgresMigration_GoalsComparisonRenamed verifies that migration 7→8
// (0009_goals_rename_comparison) renames 'MORE_THAN' → 'GREATER_THAN' and
// 'MORE_THAN_OR_EQUAL_TO' → 'GREATER_THAN_OR_EQUAL_TO' in existing goal rows.
func TestPostgresMigration_GoalsComparisonRenamed(t *testing.T) {
	ctx := t.Context()
	conn := openAndResetPGDB(t)

	// Run migrations VERSION_NONE → 7 (first 8 entries, indices 0-7).
	// Migration at index 7 (6→7) creates the pon.user_goal table.
	_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, postgresUpMigrations[:8])
	require.NoError(t, err)

	// Insert a user using the v7 schema (DARK_MODE BOOLEAN column).
	var userID int
	require.NoError(t, conn.QueryRowContext(ctx, `
		INSERT INTO pon.user
			(name, password, dark_mode, show_diabetes, caloric_calc_method,
			 insulin_sensitivity_factor, target_blood_sugar, event_history_fetch_limit,
			 session_expire_time_seconds, time_format, date_format)
		VALUES ('alice', '\x010203', TRUE, TRUE, 'auto', 3, 5.6, 50, 86400, '24-hour', 'auto')
		RETURNING id`).Scan(&userID))

	// Insert goals using the pre-rename comparison values.
	var goalMoreThanID, goalMoreThanEqID int
	require.NoError(t, conn.QueryRowContext(ctx, `
		INSERT INTO pon.user_goal
			(user_id, name, target_value, target_col, aggregation_type, value_comparison, time_expr)
		VALUES ($1, 'Goal GT', 70, 'weight_kg', 'AVG', 'MORE_THAN', 'DAILY')
		RETURNING id`, userID).Scan(&goalMoreThanID))

	require.NoError(t, conn.QueryRowContext(ctx, `
		INSERT INTO pon.user_goal
			(user_id, name, target_value, target_col, aggregation_type, value_comparison, time_expr)
		VALUES ($1, 'Goal GTE', 70, 'weight_kg', 'AVG', 'MORE_THAN_OR_EQUAL_TO', 'DAILY')
		RETURNING id`, userID).Scan(&goalMoreThanEqID))

	// Run remaining migrations (7 → 8 → ... → 13).
	_, err = database.RunUpMigrations(ctx, conn, 7, postgresUpMigrations[8:])
	require.NoError(t, err)

	var comp1, comp2 string
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT value_comparison FROM pon.user_goal WHERE id = $1`, goalMoreThanID).Scan(&comp1))
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT value_comparison FROM pon.user_goal WHERE id = $1`, goalMoreThanEqID).Scan(&comp2))

	assert.Equal(t, "GREATER_THAN", comp1)
	assert.Equal(t, "GREATER_THAN_OR_EQUAL_TO", comp2)
}

// TestPostgresMigration_FoodlogNullEventlogIDRemoved verifies that migration 12→13
// (0014_foodlog_eventlog_delete_cascade) deletes foodlog rows where EVENTLOG_ID is NULL
// and preserves rows that have a valid EVENTLOG_ID.
func TestPostgresMigration_FoodlogNullEventlogIDRemoved(t *testing.T) {
	ctx := t.Context()
	conn := openAndResetPGDB(t)

	// Run migrations VERSION_NONE → 12 (first 13 entries, indices 0-12).
	// At v12 the schema has: THEME column (not DARK_MODE), USER_AGENT on sessions,
	// and USER_FOODLOG with nullable EVENTLOG_ID and an EVENT_ID column.
	_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, postgresUpMigrations[:13])
	require.NoError(t, err)

	// Insert a user using the v12 schema (THEME VARCHAR already renamed from DARK_MODE).
	var userID int
	require.NoError(t, conn.QueryRowContext(ctx, `
		INSERT INTO pon.user
			(name, password, theme, show_diabetes, caloric_calc_method,
			 insulin_sensitivity_factor, target_blood_sugar, event_history_fetch_limit,
			 session_expire_time_seconds, time_format, date_format)
		VALUES ('alice', '\x010203', 'dark-1', TRUE, 'auto', 3, 5.6, 50, 86400, '24-hour', 'auto')
		RETURNING id`).Scan(&userID))

	// Insert an event and eventlog.
	var eventID int
	require.NoError(t, conn.QueryRowContext(ctx,
		`INSERT INTO pon.user_event (user_id, name) VALUES ($1, 'Dinner') RETURNING id`,
		userID).Scan(&eventID))

	var eventlogID int
	require.NoError(t, conn.QueryRowContext(ctx, `
		INSERT INTO pon.user_eventlog
			(user_id, event_id, user_time, event,
			 net_carbs, blood_glucose, insulin_sensitivity_factor,
			 insulin_to_carb_ratio, blood_glucose_target,
			 recommended_insulin_amount, actual_insulin_taken)
		VALUES ($1, $2, NOW(), 'Dinner', 0, 0, 0, 0, 0, 0, 0)
		RETURNING id`, userID, eventID).Scan(&eventlogID))

	// Insert a foodlog WITH a valid EVENTLOG_ID — should survive the migration.
	_, err = conn.ExecContext(ctx, `
		INSERT INTO pon.user_foodlog
			(user_id, eventlog_id, user_time, name, event, unit, portion, protein, carb, fibre, fat)
		VALUES ($1, $2, NOW(), 'Egg', 'Dinner', 'g', 100, 13, 1, 0, 11)`,
		userID, eventlogID)
	require.NoError(t, err)

	// Insert a foodlog WITHOUT EVENTLOG_ID — should be deleted by the migration.
	_, err = conn.ExecContext(ctx, `
		INSERT INTO pon.user_foodlog
			(user_id, eventlog_id, user_time, name, event, unit, portion, protein, carb, fibre, fat)
		VALUES ($1, NULL, NOW(), 'Toast', 'Dinner', 'g', 50, 4, 15, 2, 1)`,
		userID)
	require.NoError(t, err)

	// Confirm both rows exist before the final migration.
	var preMigCount int
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM pon.user_foodlog`).Scan(&preMigCount))
	require.Equal(t, 2, preMigCount, "both foodlogs should exist before migration")

	// Run the final migration (12 → 13).
	_, err = database.RunUpMigrations(ctx, conn, 12, postgresUpMigrations[13:])
	require.NoError(t, err)

	// Only the row with EVENTLOG_ID should remain.
	var postMigCount int
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM pon.user_foodlog`).Scan(&postMigCount))
	assert.Equal(t, 1, postMigCount, "only the foodlog with EVENTLOG_ID should survive")

	var survivingName string
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT name FROM pon.user_foodlog`).Scan(&survivingName))
	assert.Equal(t, "Egg", survivingName)
}

// TestPostgresMigration_FoodlogCascadeDeleteAfterMigration verifies that on the fully-migrated
// schema, deleting an eventlog also cascade-deletes its associated foodlogs.
func TestPostgresMigration_FoodlogCascadeDeleteAfterMigration(t *testing.T) {
	ctx := t.Context()
	conn := openAndResetPGDB(t)

	require.NoError(t, conn.Migrate(ctx))

	userID, err := conn.AddUser(ctx, &database.TblUser{Name: "alice", Password: []byte{1}})
	require.NoError(t, err)

	eventID, err := conn.AddUserEvent(ctx, &database.TblUserEvent{UserID: userID, Name: "Dinner"})
	require.NoError(t, err)

	logID, err := conn.AddUserEventLogWith(ctx,
		&database.TblUserEventLog{UserID: userID, EventID: eventID},
		[]database.TblUserFoodLog{{
			UserID: userID, Name: "Egg", Unit: "g",
			Portion: 100, Protein: 13, Carb: 1, Fat: 11,
		}},
	)
	require.NoError(t, err)

	var before int
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM pon.user_foodlog WHERE eventlog_id = $1`, logID,
	).Scan(&before))
	require.Equal(t, 1, before)

	require.NoError(t, conn.DeleteUserEventLog(ctx, userID, logID))

	var after int
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM pon.user_foodlog WHERE eventlog_id = $1`, logID,
	).Scan(&after))
	assert.Equal(t, 0, after, "foodlog should have been cascade-deleted with the eventlog")
}
