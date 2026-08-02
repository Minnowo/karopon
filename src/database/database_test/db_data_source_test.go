package database_test

import (
	"karopon/src/database"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testDataSourceAndSimilarSearch(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	ctx := t.Context()

	lock.Lock()
	t.Cleanup(lock.Unlock)

	db := newTestDB(t)

	ds := &database.TblDataSource{
		Name:  "USDA",
		URL:   "https://",
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
}

func testLoadDataSourceFoodBySimilarNameN(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	ctx := t.Context()
	db := newTestDB(t)

	ds := &database.TblDataSource{Name: "TestDB", URL: "https://example.com", Notes: ""}
	dsID, err := db.AddDataSource(ctx, ds)
	require.NoError(t, err)

	for _, name := range []string{"Banana", "Banana Split", "Apple"} {
		_, err := db.AddDataSourceFood(ctx, &database.TblDataSourceFood{DataSourceID: dsID, Name: name})
		require.NoError(t, err)
	}

	var results []database.TblDataSourceFood
	require.NoError(t, db.LoadDataSourceFoodBySimilarNameN(ctx, dsID, "Ban", 1, &results))
	assert.Len(t, results, 1)
}
