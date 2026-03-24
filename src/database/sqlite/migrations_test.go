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

// TestSqliteMigrations runs each migration in order on a single shared in-memory database.
// Each subtest applies exactly one migration step and validates the resulting schema change.
// State (inserted IDs, etc.) is shared across subtests so later tests build on earlier ones.
// To add a test for a new migration, append a new t.Run block at the bottom.
func TestSqliteMigrations(t *testing.T) {
	ctx := t.Context()
	conn := openMemoryDB(t)

	var userID int

	// 0001_system: VERSION_NONE → 0
	// Creates all core tables (PON_USER, PON_USER_EVENT, PON_USER_EVENTLOG, etc.).
	t.Run("0001_system", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, database.VERSION_NONE, sqliteUpMigrations[0:1])
		require.NoError(t, err)

		ver, err := conn.GetVersion(ctx)
		require.NoError(t, err)
		assert.Equal(t, database.Version(0), ver)

		// Verify the schema is functional by inserting a user.
		res, err := conn.ExecContext(ctx, `INSERT INTO PON_USER (NAME, PASSWORD) VALUES ('alice', X'010203')`)
		require.NoError(t, err)
		id, err := res.LastInsertId()
		require.NoError(t, err)
		userID = int(id)
		require.NotZero(t, userID)
	})

	// 0002_session_user_agent: 0 → 1
	// Adds USER_AGENT TEXT NOT NULL DEFAULT '' to PON_USER_SESSION.
	t.Run("0002_session_user_agent", func(t *testing.T) {
		// Insert a session before migration — the USER_AGENT column does not exist yet.
		token := make([]byte, 32)
		_, err := conn.ExecContext(ctx,
			`INSERT INTO PON_USER_SESSION (USER_ID, EXPIRES, TOKEN) VALUES (?, datetime('now','+1 hour'), ?)`,
			userID, token)
		require.NoError(t, err)

		_, err = database.RunUpMigrations(ctx, conn, 0, sqliteUpMigrations[1:2])
		require.NoError(t, err)

		// Pre-existing session must survive with USER_AGENT defaulting to ''.
		var userAgent string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT USER_AGENT FROM PON_USER_SESSION WHERE USER_ID = ?`, userID,
		).Scan(&userAgent))
		assert.Equal(t, "", userAgent)
	})

	// 0003_foodlog_eventlog_delete_cascade: 1 → 2
	// Deletes PON_USER_FOODLOG rows with NULL EVENTLOG_ID and adds ON DELETE CASCADE on that FK.
	t.Run("0003_foodlog_eventlog_delete_cascade", func(t *testing.T) {
		// Insert event and eventlog to anchor a valid foodlog.
		res, err := conn.ExecContext(ctx,
			`INSERT INTO PON_USER_EVENT (USER_ID, NAME) VALUES (?, 'Dinner')`, userID)
		require.NoError(t, err)
		eventIDInt64, _ := res.LastInsertId()
		eventID := int(eventIDInt64)

		res, err = conn.ExecContext(ctx, `
			INSERT INTO PON_USER_EVENTLOG
				(USER_ID, EVENT_ID, USER_TIME, EVENT,
				 NET_CARBS, BLOOD_GLUCOSE, INSULIN_SENSITIVITY_FACTOR,
				 INSULIN_TO_CARB_RATIO, BLOOD_GLUCOSE_TARGET,
				 RECOMMENDED_INSULIN_AMOUNT, ACTUAL_INSULIN_TAKEN)
			VALUES (?, ?, datetime('now'), 'Dinner', 0, 0, 0, 0, 0, 0, 0)`,
			userID, eventID)
		require.NoError(t, err)
		eventlogIDInt64, _ := res.LastInsertId()
		eventlogID := int(eventlogIDInt64)

		// Foodlog with valid EVENTLOG_ID — must survive the migration.
		_, err = conn.ExecContext(ctx, `
			INSERT INTO PON_USER_FOODLOG
				(USER_ID, EVENTLOG_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
			VALUES (?, ?, datetime('now'), 'Egg', 'Dinner', 'g', 100, 13, 1, 0, 11)`,
			userID, eventlogID)
		require.NoError(t, err)

		// Foodlog with NULL EVENTLOG_ID — must be deleted by the migration.
		_, err = conn.ExecContext(ctx, `
			INSERT INTO PON_USER_FOODLOG
				(USER_ID, EVENTLOG_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
			VALUES (?, NULL, datetime('now'), 'Toast', 'Dinner', 'g', 50, 4, 15, 2, 1)`,
			userID)
		require.NoError(t, err)

		_, err = database.RunUpMigrations(ctx, conn, 1, sqliteUpMigrations[2:3])
		require.NoError(t, err)

		var count int
		require.NoError(t, conn.QueryRowContext(ctx, `SELECT COUNT(*) FROM PON_USER_FOODLOG`).Scan(&count))
		assert.Equal(t, 1, count, "only the foodlog with EVENTLOG_ID should survive")

		var name string
		require.NoError(t, conn.QueryRowContext(ctx, `SELECT NAME FROM PON_USER_FOODLOG`).Scan(&name))
		assert.Equal(t, "Egg", name)

		// Verify ON DELETE CASCADE: deleting the eventlog must also delete its foodlog.
		require.NoError(t, conn.DeleteUserEventLog(ctx, userID, eventlogID))

		var afterCascade int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM PON_USER_FOODLOG WHERE EVENTLOG_ID = ?`, eventlogID,
		).Scan(&afterCascade))
		assert.Equal(t, 0, afterCascade, "foodlog should be cascade-deleted with its eventlog")
	})

	// 0004_event_log_trailing_rows: 2 → 3
	// Adds EVENT_LOG_TRAILING_ROWS INTEGER NOT NULL DEFAULT 3 to PON_USER.
	t.Run("0004_event_log_trailing_rows", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 2, sqliteUpMigrations[3:4])
		require.NoError(t, err)

		// Pre-existing user row must have the column default value of 3.
		var trailing int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT EVENT_LOG_TRAILING_ROWS FROM PON_USER WHERE ID = ?`, userID,
		).Scan(&trailing))
		assert.Equal(t, 3, trailing)
	})

	// 0005_day_time_offset: 3 → 4
	// Adds DAY_TIME_OFFSET_SECONDS INTEGER NOT NULL DEFAULT 0 to PON_USER.
	t.Run("0005_day_time_offset", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 3, sqliteUpMigrations[4:5])
		require.NoError(t, err)

		// Pre-existing user must get the default of 0.
		var offset int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT DAY_TIME_OFFSET_SECONDS FROM PON_USER WHERE ID = ?`, userID,
		).Scan(&offset))
		assert.Equal(t, 0, offset)
	})

	// 0006_dashboard: 4 → 5
	// Creates PON_USER_DASHBOARD(ID PK, USER_ID FK, NAME, DATA).
	t.Run("0006_dashboard", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 4, sqliteUpMigrations[5:6])
		require.NoError(t, err)

		// Table must accept inserts with the full set of columns.
		var dashID int64
		res, err := conn.ExecContext(ctx,
			`INSERT INTO PON_USER_DASHBOARD (USER_ID, NAME, DATA) VALUES (?, 'My Board', '[]')`, userID)
		require.NoError(t, err)
		dashID, err = res.LastInsertId()
		require.NoError(t, err)
		require.NotZero(t, dashID)

		// NAME and DATA must round-trip correctly.
		var name, data string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT NAME, DATA FROM PON_USER_DASHBOARD WHERE ID = ?`, dashID,
		).Scan(&name, &data))
		assert.Equal(t, "My Board", name)
		assert.Equal(t, "[]", data)

		// FK must prevent referencing a non-existent user.
		_, err = conn.ExecContext(ctx,
			`INSERT INTO PON_USER_DASHBOARD (USER_ID, NAME, DATA) VALUES (99999, 'Ghost', '[]')`)
		require.Error(t, err, "FK violation should be rejected")
	})

	// 0007_tag_color: 5 → 6
	// Creates PON_USER_TAG_COLOR(USER_ID, NAMESPACE) composite PK with COLOR column.
	t.Run("0007_tag_color", func(t *testing.T) {
		_, err := database.RunUpMigrations(ctx, conn, 5, sqliteUpMigrations[6:7])
		require.NoError(t, err)

		// Table must accept inserts.
		_, err = conn.ExecContext(ctx,
			`INSERT INTO PON_USER_TAG_COLOR (USER_ID, NAMESPACE, COLOR) VALUES (?, 'food', '#ff0000')`, userID)
		require.NoError(t, err)

		// Values must round-trip correctly.
		var namespace, color string
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT NAMESPACE, COLOR FROM PON_USER_TAG_COLOR WHERE USER_ID = ?`, userID,
		).Scan(&namespace, &color))
		assert.Equal(t, "food", namespace)
		assert.Equal(t, "#ff0000", color)

		// Duplicate (USER_ID, NAMESPACE) must replace the existing row (composite PK).
		_, err = conn.ExecContext(
			ctx,
			`INSERT OR REPLACE INTO PON_USER_TAG_COLOR (USER_ID, NAMESPACE, COLOR) VALUES (?, 'food', '#00ff00')`,
			userID,
		)
		require.NoError(t, err)

		var count int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM PON_USER_TAG_COLOR WHERE USER_ID = ?`, userID,
		).Scan(&count))
		assert.Equal(t, 1, count, "INSERT OR REPLACE must not create a duplicate row")

		// FK must prevent referencing a non-existent user.
		_, err = conn.ExecContext(ctx,
			`INSERT INTO PON_USER_TAG_COLOR (USER_ID, NAMESPACE, COLOR) VALUES (99999, 'food', '#ffffff')`)
		require.Error(t, err, "FK violation should be rejected")
	})

	// 0008_user_photo: 6 → 7
	// Creates PON_USER_PHOTO(ID, USER_ID, DATA) and the
	// PON_USER_EVENTLOG_PHOTO(EVENTLOG_ID, PHOTO_ID) mapping table.
	t.Run("0008_user_photo", func(t *testing.T) {
		// Tables must not exist before the migration.
		_, err := conn.ExecContext(ctx, `SELECT 1 FROM PON_USER_PHOTO LIMIT 1`)
		require.Error(t, err, "PON_USER_PHOTO must not exist before migration 0008")

		_, err = conn.ExecContext(ctx, `SELECT 1 FROM PON_USER_EVENTLOG_PHOTO LIMIT 1`)
		require.Error(t, err, "PON_USER_EVENTLOG_PHOTO must not exist before migration 0008")

		_, err = database.RunUpMigrations(ctx, conn, 6, sqliteUpMigrations[7:8])
		require.NoError(t, err)

		ver, err := conn.GetVersion(ctx)
		require.NoError(t, err)
		assert.Equal(t, database.Version(7), ver)

		// PON_USER_PHOTO must accept inserts and return an auto-increment ID.
		var photoID int64
		res, err := conn.ExecContext(ctx,
			`INSERT INTO PON_USER_PHOTO (USER_ID, DATA) VALUES (?, X'89504e47')`, userID)
		require.NoError(t, err)
		photoID, err = res.LastInsertId()
		require.NoError(t, err)
		require.NotZero(t, photoID)

		// All expected columns must be readable.
		var gotUserID int
		var gotData []byte
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT USER_ID, DATA FROM PON_USER_PHOTO WHERE ID = ?`, photoID,
		).Scan(&gotUserID, &gotData))
		assert.Equal(t, userID, gotUserID)
		assert.Equal(t, []byte{0x89, 0x50, 0x4e, 0x47}, gotData)

		// FK on USER_ID must reject a non-existent user.
		_, err = conn.ExecContext(ctx, `INSERT INTO PON_USER_PHOTO (USER_ID, DATA) VALUES (99999, X'00')`)
		require.Error(t, err, "FK violation on USER_ID should be rejected")

		// Insert an eventlog to use as the mapping target.
		res, err = conn.ExecContext(ctx, `
			INSERT INTO PON_USER_EVENTLOG
				(USER_ID, EVENT_ID, USER_TIME, EVENT,
				 NET_CARBS, BLOOD_GLUCOSE, INSULIN_SENSITIVITY_FACTOR,
				 INSULIN_TO_CARB_RATIO, BLOOD_GLUCOSE_TARGET,
				 RECOMMENDED_INSULIN_AMOUNT, ACTUAL_INSULIN_TAKEN)
			SELECT ?, ID, datetime('now'), NAME, 0, 0, 0, 0, 0, 0, 0
			FROM PON_USER_EVENT WHERE USER_ID = ? LIMIT 1`,
			userID, userID)
		require.NoError(t, err)
		eventlogIDInt64, _ := res.LastInsertId()
		eventlogID := int(eventlogIDInt64)
		require.NotZero(t, eventlogID)

		// PON_USER_EVENTLOG_PHOTO must accept a valid mapping.
		_, err = conn.ExecContext(ctx,
			`INSERT INTO PON_USER_EVENTLOG_PHOTO (EVENTLOG_ID, PHOTO_ID) VALUES (?, ?)`,
			eventlogID, photoID)
		require.NoError(t, err)

		// Composite PK must reject a duplicate mapping.
		_, err = conn.ExecContext(ctx,
			`INSERT INTO PON_USER_EVENTLOG_PHOTO (EVENTLOG_ID, PHOTO_ID) VALUES (?, ?)`,
			eventlogID, photoID)
		require.Error(t, err, "duplicate (EVENTLOG_ID, PHOTO_ID) must be rejected")

		// ON DELETE CASCADE from PON_USER_EVENTLOG must remove the mapping row.
		_, err = conn.ExecContext(ctx,
			`DELETE FROM PON_USER_EVENTLOG WHERE ID = ?`, eventlogID)
		require.NoError(t, err)

		var mappingCount int
		require.NoError(t, conn.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM PON_USER_EVENTLOG_PHOTO WHERE EVENTLOG_ID = ?`, eventlogID,
		).Scan(&mappingCount))
		assert.Equal(t, 0, mappingCount, "mapping rows must be cascade-deleted with their eventlog")
	})
}
