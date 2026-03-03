package sqlite

import (
	"testing"

	"karopon/src/database"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func openMemoryDB(t *testing.T) *SqliteDatabase {

	t.Helper()
	conn, err := OpenSqliteDatabase(t.Context(), ":memory:")
	require.NoError(t, err)

	return conn
}

// TestSqliteMigration_FreshInstall verifies that a fresh database migrates cleanly to the
// latest version and that the schema is functional.
func TestSqliteMigration_FreshInstall(t *testing.T) {
	ctx := t.Context()
	conn := openMemoryDB(t)

	require.NoError(t, conn.Migrate(ctx))

	ver, err := conn.GetVersion(ctx)
	require.NoError(t, err)
	assert.Equal(t, conn.GetMigrationMaxVersion(), ver)

	// Verify the schema is functional by performing a basic insert.
	userID, err := conn.AddUser(ctx, &database.TblUser{Name: "testuser", Password: []byte{1}})
	require.NoError(t, err)
	require.NotZero(t, userID)
}

// TestSqliteMigration_SessionUserAgentPreserved verifies that sessions inserted at version 0
// (before migration 0→1 adds the USER_AGENT column) survive the migration and default to ”.
func TestSqliteMigration_SessionUserAgentPreserved(t *testing.T) {
	ctx := t.Context()
	conn := openMemoryDB(t)

	// Run only the first migration (VERSION_NONE → 0): creates all tables without USER_AGENT on PON_USER_SESSION.
	_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, sqliteUpMigrations[:1])
	require.NoError(t, err)

	// Insert a user using raw SQL at the v0 schema.
	res, err := conn.ExecContext(ctx, `INSERT INTO PON_USER (NAME, PASSWORD) VALUES ('alice', X'010203')`)
	require.NoError(t, err)
	userIDInt64, err := res.LastInsertId()
	require.NoError(t, err)
	userID := int(userIDInt64)

	// Insert a session — v0 PON_USER_SESSION has no USER_AGENT column.
	token := make([]byte, 32)
	_, err = conn.ExecContext(ctx,
		`INSERT INTO PON_USER_SESSION (USER_ID, EXPIRES, TOKEN) VALUES (?, datetime('now','+1 hour'), ?)`,
		userID, token,
	)
	require.NoError(t, err)

	// Run remaining migrations (0 → 1 → 2).
	_, err = database.RunUpMigrations(ctx, conn, 0, sqliteUpMigrations[1:])
	require.NoError(t, err)

	// Session must still exist and USER_AGENT must default to ''.
	var userAgent string
	err = conn.QueryRowContext(ctx,
		`SELECT USER_AGENT FROM PON_USER_SESSION WHERE USER_ID = ?`, userID,
	).Scan(&userAgent)
	require.NoError(t, err)
	assert.Equal(t, "", userAgent)
}

// TestSqliteMigration_FoodlogNullEventlogIDRemoved verifies that migration 1→2
// (0003_foodlog_eventlog_delete_cascade) deletes foodlog rows where EVENTLOG_ID is NULL
// and preserves rows that have a valid EVENTLOG_ID.
func TestSqliteMigration_FoodlogNullEventlogIDRemoved(t *testing.T) {
	ctx := t.Context()
	conn := openMemoryDB(t)

	// Set up at version 1 (first two migrations: VERSION_NONE → 0 → 1).
	_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, sqliteUpMigrations[:2])
	require.NoError(t, err)

	// Insert user.
	res, err := conn.ExecContext(ctx, `INSERT INTO PON_USER (NAME, PASSWORD) VALUES ('alice', X'010203')`)
	require.NoError(t, err)
	userIDInt64, err := res.LastInsertId()
	require.NoError(t, err)
	userID := int(userIDInt64)

	// Insert event.
	res, err = conn.ExecContext(ctx,
		`INSERT INTO PON_USER_EVENT (USER_ID, NAME) VALUES (?, 'Dinner')`, userID)
	require.NoError(t, err)
	eventIDInt64, err := res.LastInsertId()
	require.NoError(t, err)
	eventID := int(eventIDInt64)

	// Insert eventlog.
	res, err = conn.ExecContext(ctx, `
		INSERT INTO PON_USER_EVENTLOG
			(USER_ID, EVENT_ID, USER_TIME, EVENT,
			 NET_CARBS, BLOOD_GLUCOSE, INSULIN_SENSITIVITY_FACTOR,
			 INSULIN_TO_CARB_RATIO, BLOOD_GLUCOSE_TARGET,
			 RECOMMENDED_INSULIN_AMOUNT, ACTUAL_INSULIN_TAKEN)
		VALUES (?, ?, datetime('now'), 'Dinner', 0, 0, 0, 0, 0, 0, 0)`,
		userID, eventID)
	require.NoError(t, err)
	eventlogIDInt64, err := res.LastInsertId()
	require.NoError(t, err)
	eventlogID := int(eventlogIDInt64)

	// Insert a foodlog WITH a valid EVENTLOG_ID — should survive the migration.
	_, err = conn.ExecContext(ctx, `
		INSERT INTO PON_USER_FOODLOG
			(USER_ID, EVENTLOG_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
		VALUES (?, ?, datetime('now'), 'Egg', 'Dinner', 'g', 100, 13, 1, 0, 11)`,
		userID, eventlogID)
	require.NoError(t, err)

	// Insert a foodlog WITHOUT EVENTLOG_ID — should be deleted by the migration.
	_, err = conn.ExecContext(ctx, `
		INSERT INTO PON_USER_FOODLOG
			(USER_ID, EVENTLOG_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
		VALUES (?, NULL, datetime('now'), 'Toast', 'Dinner', 'g', 50, 4, 15, 2, 1)`,
		userID)
	require.NoError(t, err)

	// Confirm both rows exist before the migration.
	var preMigCount int
	require.NoError(t, conn.QueryRowContext(ctx, `SELECT COUNT(*) FROM PON_USER_FOODLOG`).Scan(&preMigCount))
	require.Equal(t, 2, preMigCount, "both foodlogs should exist before migration")

	// Run the final migration (1 → 2).
	_, err = database.RunUpMigrations(ctx, conn, 1, sqliteUpMigrations[2:])
	require.NoError(t, err)

	// Only the row with EVENTLOG_ID should remain.
	var postMigCount int
	require.NoError(t, conn.QueryRowContext(ctx, `SELECT COUNT(*) FROM PON_USER_FOODLOG`).Scan(&postMigCount))
	assert.Equal(t, 1, postMigCount, "only the foodlog with EVENTLOG_ID should survive")

	var survivingName string
	require.NoError(t, conn.QueryRowContext(ctx, `SELECT NAME FROM PON_USER_FOODLOG`).Scan(&survivingName))
	assert.Equal(t, "Egg", survivingName)
}

// TestSqliteMigration_FoodlogCascadeDeleteAfterMigration verifies that on the fully-migrated
// schema, deleting an eventlog also cascade-deletes its associated foodlogs.
func TestSqliteMigration_FoodlogCascadeDeleteAfterMigration(t *testing.T) {
	ctx := t.Context()
	conn := openMemoryDB(t)
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
		`SELECT COUNT(*) FROM PON_USER_FOODLOG WHERE EVENTLOG_ID = ?`, logID,
	).Scan(&before))
	require.Equal(t, 1, before)

	require.NoError(t, conn.DeleteUserEventLog(ctx, userID, logID))

	var after int
	require.NoError(t, conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM PON_USER_FOODLOG WHERE EVENTLOG_ID = ?`, logID,
	).Scan(&after))
	assert.Equal(t, 0, after, "foodlog should have been cascade-deleted with the eventlog")
}
