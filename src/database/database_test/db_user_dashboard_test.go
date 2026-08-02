package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testDashboardCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	// Load on empty database returns an empty slice without error.
	var dashboards []database.TblUserDashboard
	require.NoError(t, db.LoadUserDashboards(ctx, userID, &dashboards))
	assert.Empty(t, dashboards)

	// Add a dashboard.
	d := &database.TblUserDashboard{
		UserID: userID,
		Name:   "Default",
		Data:   `[{"id":"card-1"}]`,
	}
	id, err := db.AddUserDashboard(ctx, d)
	require.NoError(t, err)
	require.NotZero(t, id)
	d.ID = id

	// Load it back.
	dashboards = dashboards[:0]
	require.NoError(t, db.LoadUserDashboards(ctx, userID, &dashboards))
	require.Len(t, dashboards, 1)
	assert.Equal(t, id, dashboards[0].ID)
	assert.Equal(t, userID, dashboards[0].UserID)
	assert.Equal(t, "Default", dashboards[0].Name)
	assert.Equal(t, `[{"id":"card-1"}]`, dashboards[0].Data)

	// Update name and data.
	d.Name = "My Board"
	d.Data = `[{"id":"card-2"}]`
	require.NoError(t, db.UpdateUserDashboard(ctx, d))

	dashboards = dashboards[:0]
	require.NoError(t, db.LoadUserDashboards(ctx, userID, &dashboards))
	require.Len(t, dashboards, 1)
	assert.Equal(t, "My Board", dashboards[0].Name)
	assert.Equal(t, `[{"id":"card-2"}]`, dashboards[0].Data)

	// Update with a wrong user_id must not affect the row.
	bogus := &database.TblUserDashboard{ID: id, UserID: userID + 99, Name: "Hijacked", Data: "[]"}
	require.NoError(t, db.UpdateUserDashboard(ctx, bogus))

	dashboards = dashboards[:0]
	require.NoError(t, db.LoadUserDashboards(ctx, userID, &dashboards))
	require.Len(t, dashboards, 1)
	assert.Equal(t, "My Board", dashboards[0].Name, "row must be unchanged after wrong-user update")

	// Delete it.
	require.NoError(t, db.DeleteUserDashboard(ctx, userID, id))

	dashboards = dashboards[:0]
	require.NoError(t, db.LoadUserDashboards(ctx, userID, &dashboards))
	assert.Empty(t, dashboards)
}

func testDashboardMultiplePerUser(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)
	userID2 := getTestUser2(t, db)

	for _, name := range []string{"Board A", "Board B"} {
		_, err := db.AddUserDashboard(ctx, &database.TblUserDashboard{
			UserID: userID,
			Name:   name,
			Data:   "[]",
		})
		require.NoError(t, err)
	}

	// A different user's dashboard must not appear in userID's list.
	_, err := db.AddUserDashboard(ctx, &database.TblUserDashboard{
		UserID: userID2,
		Name:   "Other User",
		Data:   "[]",
	})
	require.NoError(t, err)

	var dashboards []database.TblUserDashboard
	require.NoError(t, db.LoadUserDashboards(ctx, userID, &dashboards))
	require.Len(t, dashboards, 2)
	assert.Equal(t, "Board A", dashboards[0].Name)
	assert.Equal(t, "Board B", dashboards[1].Name)
}
