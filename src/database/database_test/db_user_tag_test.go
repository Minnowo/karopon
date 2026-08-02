package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testAddUserTag(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}

func testLoadUserTags(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}

func testLoadUserTagNamespaces(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}

func testLoadUserNamespaceTags(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}

func testLoadUserNamespaceTagsLikeN(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}
