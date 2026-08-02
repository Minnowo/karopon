package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testFoodCRUD1(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}

func testFoodCRUD2(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
}

func testUpdateUserFood(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
	foodID, err := db.AddUserFood(ctx, food)
	require.NoError(t, err)
	food.ID = foodID

	food.Name = "Large Egg"
	food.Protein = 10
	require.NoError(t, db.UpdateUserFood(ctx, food))

	var foods []database.TblUserFood
	require.NoError(t, db.LoadUserFoods(ctx, userID, &foods))
	require.Len(t, foods, 1)
	assert.Equal(t, "Large Egg", foods[0].Name)
	assert.InDelta(t, 10.0, foods[0].Protein, 0.001)
}
