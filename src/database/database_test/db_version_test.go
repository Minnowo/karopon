package database_test

import (
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testVersionCheck(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

	lock.Lock()
	t.Cleanup(lock.Unlock)

	db := newTestDB(t)

	v, err := db.GetVersion(t.Context())
	require.NoError(t, err)

	maxVer := db.GetMigrationMaxVersion()
	assert.Equal(t, v, maxVer)
}
