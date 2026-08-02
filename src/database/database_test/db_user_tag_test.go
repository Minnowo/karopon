package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"
	"time"

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

func testUpdateUserTag(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	tag := &database.TblUserTag{UserID: userID, Namespace: "food", Name: "a:01"}
	_, err := db.AddUserTag(ctx, tag)
	require.NoError(t, err)

	err = db.UpdateUserTag(ctx, userID, "food", "a:01", "food", "a:1", false)
	require.NoError(t, err)

	var loadedTags []database.TblUserTag
	err = db.LoadUserTags(ctx, userID, &loadedTags)
	require.NoError(t, err)
	require.Len(t, loadedTags, 1)
	assert.Equal(t, "a:1", loadedTags[0].Name)
}

func testUpdateUserTagCollisionWithoutMerge(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	_, err := db.AddUserTag(ctx, &database.TblUserTag{UserID: userID, Namespace: "food", Name: "a:01"})
	require.NoError(t, err)
	_, err = db.AddUserTag(ctx, &database.TblUserTag{UserID: userID, Namespace: "food", Name: "a:1"})
	require.NoError(t, err)

	err = db.UpdateUserTag(ctx, userID, "food", "a:01", "food", "a:1", false)
	require.ErrorIs(t, err, database.ErrTagAlreadyExists)

	// Nothing should have changed.
	var loadedTags []database.TblUserTag
	err = db.LoadUserTags(ctx, userID, &loadedTags)
	require.NoError(t, err)
	assert.Len(t, loadedTags, 2)
}

func testUpdateUserTagMerge(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	newTimespan := func(tags []database.TblUserTag) int {
		id, err := db.AddUserTimespan(ctx, &database.TblUserTimespan{
			UserID:    userID,
			StartTime: database.TimeMillis(time.Now()),
			StopTime:  database.TimeMillis(time.Now().Add(time.Hour)),
		}, tags)
		require.NoError(t, err)
		return id
	}

	oldTag := database.TblUserTag{UserID: userID, Namespace: "food", Name: "a:01"}
	newTag := database.TblUserTag{UserID: userID, Namespace: "food", Name: "a:1"}

	// timespan1 only has the old tag, timespan2 only has the new tag,
	// timespan3 has both (the duplicate case merging must de-duplicate).
	ts1 := newTimespan([]database.TblUserTag{oldTag})
	ts2 := newTimespan([]database.TblUserTag{newTag})
	ts3 := newTimespan([]database.TblUserTag{oldTag, newTag})

	err := db.UpdateUserTag(ctx, userID, "food", "a:01", "food", "a:1", true)
	require.NoError(t, err)

	// The old tag should be gone, and only the merged-into tag should remain.
	var loadedTags []database.TblUserTag
	err = db.LoadUserTags(ctx, userID, &loadedTags)
	require.NoError(t, err)
	require.Len(t, loadedTags, 1)
	assert.Equal(t, "a:1", loadedTags[0].Name)

	var tagged []database.TaggedTimespan
	err = db.LoadUserTimespansWithTags(ctx, userID, &tagged)
	require.NoError(t, err)
	require.Len(t, tagged, 3)

	byID := make(map[int]database.TaggedTimespan, len(tagged))
	for _, tt := range tagged {
		byID[tt.Timespan.ID] = tt
	}

	for _, id := range []int{ts1, ts2, ts3} {
		tt, ok := byID[id]
		require.True(t, ok)
		require.Len(t, tt.Tags, 1)
		assert.Equal(t, "a:1", tt.Tags[0].Name)
	}
}
