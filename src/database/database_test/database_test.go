package database_test

import (
	"bytes"
	"context"
	"database/sql"
	"io"
	"karopon/src/database"
	"karopon/src/database/postgres"
	"karopon/src/database/sqlite"
	"path"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vinovest/sqlx"
)

type NewTestDB func(t *testing.T) database.DB

func getTestUser(t *testing.T, db database.DB) int {

	user := &database.TblUser{
		Name: "test_user",
	}
	userID, err := db.AddUser(t.Context(), user)
	require.NoError(t, err)

	return userID
}

func runDbTests(t *testing.T, newTestDB NewTestDB) {

	// Prevent any db tests from running at the same time,
	// since the db backend may or may not be a single instance.
	// If newTestDB does not return a separate db, and instead clears a single one each test,
	// this should prevent problems.
	lock := sync.Mutex{}

	t.Run("version_check", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		db := newTestDB(t)

		v, err := db.GetVersion(t.Context())
		require.NoError(t, err)

		maxVer := db.GetMigrationMaxVersion()
		assert.Equal(t, v, maxVer)
	})

	t.Run("user_crud", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		user := &database.TblUser{
			Name:                     "alice",
			Password:                 []byte{1, 2, 3},
			Theme:                    "auto",
			ShowDiabetes:             true,
			CaloricCalcMethod:        "auto",
			InsulinSensitivityFactor: 5,
			EventHistoryFetchLimit:   50,
			TargetBloodSugar:         7,
			SessionExpireTimeSeconds: 500,
			TimeFormat:               "auto",
			DateFormat:               "auto",
		}

		// test the username is not taken
		taken, err := db.UsernameTaken(ctx, 0, user.Name)
		require.NoError(t, err)
		assert.False(t, taken)

		// test insert
		id, err := db.AddUser(ctx, user)
		require.NoError(t, err)
		require.NotZero(t, id)

		// check the username is now taken
		taken, err = db.UsernameTaken(ctx, 0, user.Name)
		require.NoError(t, err)
		assert.True(t, taken)

		// test we can load the user back and it's data matches
		var loaded database.TblUser
		require.NoError(t, db.LoadUserById(ctx, id, &loaded))

		user.ID = loaded.ID
		user.Created = loaded.Created
		assert.Equal(t, user, &loaded)

		// test update
		loaded.Name = "alice2"
		loaded.Password = []byte{4, 5, 6}
		loaded.Theme = "dark-1"
		loaded.ShowDiabetes = false
		loaded.CaloricCalcMethod = "something_else"
		loaded.InsulinSensitivityFactor = 9
		loaded.EventHistoryFetchLimit = 10
		loaded.TargetBloodSugar = 10
		loaded.SessionExpireTimeSeconds = 100
		loaded.TimeFormat = "auto2"
		loaded.DateFormat = "auto2"
		require.NoError(t, db.UpdateUser(ctx, &loaded))

		// check the new username was taken
		taken, err = db.UsernameTaken(ctx, 0, loaded.Name)
		require.NoError(t, err)
		assert.True(t, taken)

		// check the old username is now available
		taken, err = db.UsernameTaken(ctx, 0, user.Name)
		require.NoError(t, err)
		assert.False(t, taken)

		// load into 'user' and check that it matches the updated 'loaded'
		require.NoError(t, db.LoadUserById(ctx, id, user))
		assert.Equal(t, &loaded, user)
	})

	t.Run("user_session_lifecycle", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)
		token := make([]byte, 32)
		session := &database.TblUserSession{
			UserID:  userID,
			Token:   token,
			Expires: database.TimeMillis(time.Now().Add(time.Hour)),
		}

		require.NoError(t, db.AddUserSession(ctx, session))

		var loaded database.TblUserSession
		require.NoError(t, db.LoadUserSession(ctx, token, &loaded))
		session.Created = loaded.Created
		// check the miliseconds match
		assert.Equal(t, session.Expires.Time().UnixMilli(), loaded.Expires.Time().UnixMilli())
		// the check for equal used by assert doesn't match these times,
		// something internally in the time struct is different, even though the miliseconds match.
		session.Expires = loaded.Expires
		assert.Equal(t, session, &loaded)

		require.NoError(t, db.DeleteUserSessionByToken(ctx, token))

		err := db.LoadUserSession(ctx, token, &loaded)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrNoRows)
	})

	t.Run("food_crud_1", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		food := &database.TblUserFood{
			UserID:  userID,
			Name:    "Egg",
			Unit:    "g",
			Portion: 1,
			Protein: 2,
			Carb:    3,
			Fibre:   4,
			Fat:     5,
		}

		// add food
		foodID, err := db.AddUserFood(ctx, food)
		require.NoError(t, err)
		require.NotZero(t, foodID)
		food.ID = foodID

		// load user foods
		var foods []database.TblUserFood
		require.NoError(t, db.LoadUserFoods(ctx, userID, &foods))
		assert.Len(t, foods, 1)
		assert.Equal(t, food, &foods[0])

		// delete user food
		require.NoError(t, db.DeleteUserFood(ctx, userID, foodID))

		// load again to confirm deletion
		foods = foods[0:0]
		require.NoError(t, db.LoadUserFoods(ctx, userID, &foods))
		assert.Len(t, foods, 0)
	})

	t.Run("food_crud_2", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		foods := []database.TblUserFood{
			{
				UserID:  userID,
				Name:    "Egg",
				Unit:    "g",
				Portion: 1,
				Protein: 2,
				Carb:    3,
				Fibre:   4,
				Fat:     5,
			},
			{
				UserID:  userID,
				Name:    "Milk",
				Unit:    "ml",
				Portion: 7,
				Protein: 8,
				Carb:    9,
				Fibre:   10,
				Fat:     11,
			},
		}

		// add foods
		err := db.AddUserFoods(ctx, foods)
		require.NoError(t, err)

		// load user foods
		var loadedFoods []database.TblUserFood
		err = db.LoadUserFoods(ctx, userID, &loadedFoods)
		require.NoError(t, err)
		assert.Equal(t, len(foods), len(loadedFoods))
		for i, lfood := range loadedFoods {
			foods[i].ID = lfood.ID
		}
		assert.Equal(t, foods, loadedFoods)
	})

	t.Run("event_and_eventlog", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)
		userID := getTestUser(t, db)

		event := &database.TblUserEvent{
			UserID: userID,
			Name:   "Dinner",
		}

		eventID, err := db.AddUserEvent(ctx, event)
		require.NoError(t, err)

		var loaded database.TblUserEvent
		require.NoError(t, db.LoadUserEvent(ctx, userID, eventID, &loaded))
		assert.Equal(t, "Dinner", loaded.Name)

		log := &database.TblUserEventLog{
			UserID:  userID,
			EventID: eventID,
		}

		logID, err := db.AddUserEventLogWith(ctx, log, nil)
		require.NoError(t, err)
		require.NotZero(t, logID)

		var logs []database.TblUserEventLog
		require.NoError(t, db.LoadUserEventLogs(ctx, userID, &logs))
		assert.Len(t, logs, 1)
	})

	t.Run("datasource_and_similar_search", func(t *testing.T) {

		ctx := t.Context()

		lock.Lock()
		t.Cleanup(lock.Unlock)

		db := newTestDB(t)

		ds := &database.TblDataSource{
			Name:  "USDA",
			Url:   "https://",
			Notes: "hello world",
		}
		dsID, err := db.AddDataSource(ctx, ds)
		require.NoError(t, err)
		ds.ID = dsID

		// check that it can be found by name
		{
			var loadedDS database.TblDataSource
			require.NoError(t, db.LoadDataSourceByName(ctx, "USDA", &loadedDS))
			ds.Created = loadedDS.Created
			assert.Equal(t, ds, &loadedDS)
		}

		// check that it can be found by select *
		{
			var loadedDS []database.TblDataSource
			require.NoError(t, db.LoadDataSources(ctx, &loadedDS))
			assert.NotEmpty(t, loadedDS)
			assert.Equal(t, ds, &loadedDS[0])
		}

		food := &database.TblDataSourceFood{
			DataSourceID: dsID,
			Name:         "Banana",
		}
		_, err = db.AddDataSourceFood(ctx, food)
		require.NoError(t, err)

		var results []database.TblDataSourceFood
		require.NoError(t,
			db.LoadDataSourceFoodBySimilarName(ctx, dsID, "Ban", &results),
		)

		assert.NotEmpty(t, results)
	})

	t.Run("exports_do_not_error", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		var buf bytes.Buffer

		exports := []func(context.Context, io.Writer) error{
			db.ExportUserCSV,
			db.ExportUserEventsCSV,
			db.ExportUserEventLogsCSV,
			db.ExportUserFoodsCSV,
			db.ExportUserFoodLogsCSV,
			db.ExportBodyLogCSV,
			db.ExportDbVersionCSV,
		}

		for _, fn := range exports {
			buf.Reset()
			assert.NoError(t, fn(ctx, &buf))
			assert.NotEmpty(t, buf)
		}
	})

	t.Run("with_tx_commits", func(t *testing.T) {

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
	})

	t.Run("AddUserTag", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		tag := &database.TblUserTag{
			UserID:    userID,
			Namespace: "food",
			Name:      "Egg",
		}

		tagID, err := db.AddUserTag(ctx, tag)
		require.NoError(t, err)

		var loadedTags []database.TblUserTag
		err = db.LoadUserTags(ctx, userID, &loadedTags)
		require.NoError(t, err)
		assert.Len(t, loadedTags, 1)

		tag.ID = tagID
		tag.Created = loadedTags[0].Created
		assert.Equal(t, tag, &loadedTags[0])
	})

	t.Run("LoadUserTags", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		// Add some tags to the user
		tags := []database.TblUserTag{
			{UserID: userID, Namespace: "food", Name: "Egg"},
			{UserID: userID, Namespace: "food", Name: "Milk"},
		}

		for _, tag := range tags {
			_, err := db.AddUserTag(ctx, &tag)
			require.NoError(t, err)
		}

		// Step 1: Load the tags for the user
		var loadedTags []database.TblUserTag
		err := db.LoadUserTags(ctx, userID, &loadedTags)
		require.NoError(t, err)

		// Step 2: Verify that the loaded tags match the inserted tags
		assert.Len(t, loadedTags, len(tags))

		// Set the returned ID for comparison
		for i := range tags {
			tags[i].ID = loadedTags[i].ID
			tags[i].Created = loadedTags[i].Created
		}
		assert.ElementsMatch(t, tags, loadedTags)
	})

	t.Run("LoadUserTagNamespaces", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		// Add some tags with different namespaces
		tags := []database.TblUserTag{
			{UserID: userID, Namespace: "food", Name: "Egg"},
			{UserID: userID, Namespace: "drink", Name: "Milk"},
			{UserID: userID, Namespace: "food", Name: "Bread"},
		}

		for _, tag := range tags {
			_, err := db.AddUserTag(ctx, &tag)
			require.NoError(t, err)
		}

		// Step 1: Load distinct namespaces for the user
		var namespaces []string
		err := db.LoadUserTagNamespaces(ctx, userID, &namespaces)
		require.NoError(t, err)

		// Step 2: Verify the namespaces
		assert.ElementsMatch(t, []string{"food", "drink"}, namespaces)
	})

	t.Run("LoadUserNamespaceTags", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		// Add some tags in different namespaces
		tags := []database.TblUserTag{
			{UserID: userID, Namespace: "food", Name: "Egg"},
			{UserID: userID, Namespace: "food", Name: "Bread"},
			{UserID: userID, Namespace: "drink", Name: "Milk"},
		}

		for _, tag := range tags {
			_, err := db.AddUserTag(ctx, &tag)
			require.NoError(t, err)
		}

		// Step 1: Load tags for a specific namespace
		var loadedTags []database.TblUserTag
		err := db.LoadUserNamespaceTags(ctx, userID, "food", &loadedTags)
		require.NoError(t, err)

		// Step 2: Verify that the correct tags are loaded for the "food" namespace
		assert.Len(t, loadedTags, 2)
		assert.ElementsMatch(t, []string{"Egg", "Bread"}, []string{loadedTags[0].Name, loadedTags[1].Name})
	})

	t.Run("LoadUserNamespaceTagsLikeN", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		// Add some tags to the database
		tags := []database.TblUserTag{
			{UserID: userID, Namespace: "food", Name: "Egg"},
			{UserID: userID, Namespace: "food", Name: "Bread"},
			{UserID: userID, Namespace: "food", Name: "Milk"},
			{UserID: userID, Namespace: "food", Name: "Orange"},
		}

		for _, tag := range tags {
			_, err := db.AddUserTag(ctx, &tag)
			require.NoError(t, err)
		}

		// Step 1: Load tags with a name like "Br%" in the "food" namespace
		var loadedTags []database.TblUserTag
		err := db.LoadUserNamespaceTagsLikeN(ctx, userID, "food", "Br", 2, &loadedTags)
		require.NoError(t, err)

		// Step 2: Verify the results
		assert.Len(t, loadedTags, 1)
		assert.Equal(t, "Bread", loadedTags[0].Name)
	})

	t.Run("AddUserTimespan", func(t *testing.T) {

		lock.Lock()
		t.Cleanup(lock.Unlock)

		ctx := t.Context()
		db := newTestDB(t)

		userID := getTestUser(t, db)

		// Prepare timespan data
		note := "Test timespan"
		ts := &database.TblUserTimespan{
			UserID:    userID,
			StartTime: database.TimeMillis(time.Now()),
			StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
			Note:      &note,
		}

		tags := []database.TblUserTag{
			{UserID: userID, Namespace: "food", Name: "Egg"},
		}

		// Step 1: Add the timespan with tags
		timespanID, err := db.AddUserTimespan(ctx, ts, tags)
		require.NoError(t, err)

		// Step 2: Verify that the timespan was inserted
		var loadedTimespans []database.TblUserTimespan
		err = db.LoadUserTimespans(ctx, userID, &loadedTimespans)
		require.NoError(t, err)
		assert.Len(t, loadedTimespans, 1)
		assert.Equal(t, timespanID, loadedTimespans[0].ID)
		assert.NotNil(t, loadedTimespans[0].Note)
		assert.Equal(t, note, *loadedTimespans[0].Note)
		assert.Equal(t, ts.StartTime.Time().UnixMilli(), loadedTimespans[0].StartTime.Time().UnixMilli())
		assert.Equal(t, ts.StopTime.Time().UnixMilli(), loadedTimespans[0].StopTime.Time().UnixMilli())

		// Verify that the tags were also inserted and associated
		var loadedTags []database.TblUserTag
		err = db.LoadUserTags(ctx, userID, &loadedTags)
		require.NoError(t, err)
		tags[0].ID = loadedTags[0].ID
		tags[0].Created = loadedTags[0].Created
		assert.Equal(t, tags[0], loadedTags[0])
	})

}

func TestDB_Postgres(t *testing.T) {
	runDbTests(t, func(t *testing.T) database.DB {

		str := "user=postgres password=postgres_test port=9432 host=localhost sslmode=disable"
		conn, err := postgres.OpenPGDatabase(t.Context(), str)
		require.NoError(t, err)
		require.NotNil(t, conn)

		err = conn.Migrate(t.Context())
		require.NoError(t, err)

		tbls := []string{
			"pon.data_source",
			"pon.data_source_food",
			"pon.user",
			"pon.user_bodylog",
			"pon.user_event",
			"pon.user_eventlog",
			"pon.user_food",
			"pon.user_foodlog",
			"pon.user_goal",
			"pon.user_medication",
			"pon.user_medication_schedule",
			"pon.user_medicationlog",
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
			"PON_USER_EVENT",
			"PON_USER_EVENTLOG",
			"PON_USER_FOOD",
			"PON_USER_FOODLOG",
			"PON_USER_GOAL",
			// "PON_USER_MEDICATION",
			// "PON_USER_MEDICATION_SCHEDULE",
			// "PON_USER_MEDICATIONLOG",
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
