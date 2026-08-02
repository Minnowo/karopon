package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testTagColorCRUD(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	// Load on empty database returns an empty slice without error.
	var colors []database.TblUserTagColor
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors))
	assert.Empty(t, colors)

	// Set a color.
	c := []database.TblUserTagColor{{
		UserID:    userID,
		Namespace: "food",
		Color:     "#ff0000",
	}}
	require.NoError(t, db.SetUserTagColors(ctx, c))

	// Load it back.
	colors = colors[:0]
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors))
	require.Len(t, colors, 1)
	assert.Equal(t, userID, colors[0].UserID)
	assert.Equal(t, "food", colors[0].Namespace)
	assert.Equal(t, "#ff0000", colors[0].Color)

	// Upsert the same namespace with a new color.
	c[0].Color = "var(--c-yellow)"
	require.NoError(t, db.SetUserTagColors(ctx, c))

	colors = colors[:0]
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors))
	require.Len(t, colors, 1, "upsert must not create a duplicate row")
	assert.Equal(t, "var(--c-yellow)", colors[0].Color)

	// Set a second namespace.
	require.NoError(t, db.SetUserTagColors(ctx, []database.TblUserTagColor{{
		UserID:    userID,
		Namespace: "exercise",
		Color:     "#00ff00",
	}}))

	colors = colors[:0]
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors))
	assert.Len(t, colors, 2)

	// Delete one mapping.
	require.NoError(t, db.DeleteUserTagColors(ctx, userID, []string{"food"}))

	colors = colors[:0]
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors))
	require.Len(t, colors, 1)
	assert.Equal(t, "exercise", colors[0].Namespace)

	// Deleting a non-existent namespace is a no-op (no error).
	require.NoError(t, db.DeleteUserTagColors(ctx, userID, []string{"does_not_exist"}))
}

func testTagColorUserIsolation(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)
	userID2 := getTestUser2(t, db)

	// Both users set a color for the same namespace.
	require.NoError(t, db.SetUserTagColors(ctx, []database.TblUserTagColor{{
		UserID:    userID,
		Namespace: "food",
		Color:     "#aaaaaa",
	}}))
	require.NoError(t, db.SetUserTagColors(ctx, []database.TblUserTagColor{{
		UserID:    userID2,
		Namespace: "food",
		Color:     "#bbbbbb",
	}}))

	// Each user's load must only return their own row.
	var colors1 []database.TblUserTagColor
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors1))
	require.Len(t, colors1, 1)
	assert.Equal(t, "#aaaaaa", colors1[0].Color)

	var colors2 []database.TblUserTagColor
	require.NoError(t, db.LoadUserTagColors(ctx, userID2, &colors2))
	require.Len(t, colors2, 1)
	assert.Equal(t, "#bbbbbb", colors2[0].Color)

	// Deleting with wrong user_id must not remove the other user's row.
	require.NoError(t, db.DeleteUserTagColors(ctx, userID2, []string{"food"}))

	colors1 = colors1[:0]
	require.NoError(t, db.LoadUserTagColors(ctx, userID, &colors1))
	require.Len(t, colors1, 1, "user1's row must survive user2's delete")
}
