// Duplicates rejected by a unique constraint must come back as
// database.ErrAlreadyExists from every backend, so the API can answer 409.

package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testAlreadyExists(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	userID := getTestUser(t, db)

	// food: unique on (user, name, unit)
	rice := &database.TblUserFood{UserID: userID, Name: "Rice", Unit: "g", Portion: 1}
	_, err := db.AddUserFood(ctx, rice)
	require.NoError(t, err)

	_, err = db.AddUserFood(ctx, &database.TblUserFood{UserID: userID, Name: "Rice", Unit: "g", Portion: 1})
	assert.ErrorIs(t, err, database.ErrAlreadyExists, "AddUserFood")

	beans := &database.TblUserFood{UserID: userID, Name: "Beans", Unit: "g", Portion: 1}
	beans.ID, err = db.AddUserFood(ctx, beans)
	require.NoError(t, err)

	beans.Name = "Rice"
	assert.ErrorIs(t, db.UpdateUserFood(ctx, beans), database.ErrAlreadyExists, "UpdateUserFood")

	// tag: unique on (user, namespace, name)
	_, err = db.AddUserTag(ctx, &database.TblUserTag{UserID: userID, Namespace: "work", Name: "desk"})
	require.NoError(t, err)

	_, err = db.AddUserTag(ctx, &database.TblUserTag{UserID: userID, Namespace: "work", Name: "desk"})
	assert.ErrorIs(t, err, database.ErrAlreadyExists, "AddUserTag")

	// body metric: unique on (user, name)
	_, err = db.AddUserBodyMetric(ctx, &database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "kg"})
	require.NoError(t, err)

	_, err = db.AddUserBodyMetric(ctx, &database.TblUserBodyMetric{UserID: userID, Name: "Weight", Unit: "lb"})
	assert.ErrorIs(t, err, database.ErrAlreadyExists, "AddUserBodyMetric")

	// goal: unique on (user, name)
	newGoal := func(name string) *database.TblUserGoal {
		return &database.TblUserGoal{
			UserID:          userID,
			Name:            name,
			TargetValue:     70.0,
			TargetCol:       string(database.TargetColumnBodyMetric),
			TargetMetric:    "Weight",
			AggregationType: string(database.AggregationAvg),
			ValueComparison: string(database.ComparisonLessThan),
			TimeExpr:        "DAILY",
		}
	}

	_, err = db.AddUserGoal(ctx, newGoal("Daily Weight"))
	require.NoError(t, err)

	_, err = db.AddUserGoal(ctx, newGoal("Daily Weight"))
	assert.ErrorIs(t, err, database.ErrAlreadyExists, "AddUserGoal")

	other := newGoal("Other")
	other.ID, err = db.AddUserGoal(ctx, other)
	require.NoError(t, err)

	other.Name = "Daily Weight"
	assert.ErrorIs(t, db.UpdateUserGoal(ctx, other), database.ErrAlreadyExists, "UpdateUserGoal")
}
