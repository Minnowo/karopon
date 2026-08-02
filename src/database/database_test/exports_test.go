package database_test

import (
	"bytes"
	"context"
	"io"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
)

func testExportsDoNotError(t *testing.T, newTestDB NewTestDB, lock *sync.Mutex) {

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
		db.ExportVersionCSV,
	}

	for _, fn := range exports {
		buf.Reset()
		assert.NoError(t, fn(ctx, &buf))
		assert.NotEmpty(t, buf)
	}
}
