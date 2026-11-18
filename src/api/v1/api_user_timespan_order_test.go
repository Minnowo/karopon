// A timespan whose stop is before its start is rejected; a running timer (no
// stop time yet) and an ordered one are saved.

package v1

import (
	"context"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTimespanStopBeforeStartIsRejected(t *testing.T) {

	cases := []struct {
		name    string
		body    string
		update  bool
		pointer string
	}{
		{"new", `{"timespan":{"start_time":2000,"stop_time":1000},"tags":[]}`, false, "#/timespan/stop_time"},
		{"update", `{"id":3,"start_time":2000,"stop_time":1000}`, true, "#/stop_time"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			db := &timespanMockDB{}
			a := newTestAPI(db)
			handler := a.newUserTimespan
			if c.update {
				handler = a.updateUserTimespan
			}

			rr := sendAsUser(t, handler, c.body)

			require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
			assert.Equal(t, []string{c.pointer}, problemPointers(t, rr))
			assert.Nil(t, db.saved, "nothing may be saved")
		})
	}
}

func TestTimespanRunningAndOrderedAreSaved(t *testing.T) {

	cases := []struct {
		name   string
		body   string
		update bool
	}{
		{"new running", `{"timespan":{"start_time":5000,"stop_time":0},"tags":[]}`, false},
		{"new ordered", `{"timespan":{"start_time":1000,"stop_time":2000},"tags":[]}`, false},
		{"update running", `{"id":3,"start_time":5000,"stop_time":0}`, true},
		{"update ordered", `{"id":3,"start_time":1000,"stop_time":2000}`, true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			db := &timespanMockDB{}
			a := newTestAPI(db)
			handler := a.newUserTimespan
			if c.update {
				handler = a.updateUserTimespan
			}

			rr := sendAsUser(t, handler, c.body)

			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
			require.NotNil(t, db.saved)
		})
	}
}

// timespanMockDB keeps the timespan it was asked to save.
type timespanMockDB struct {
	mock_db.BaseMockDB

	saved *database.TblUserTimespan
}

func (m *timespanMockDB) AddUserTimespan(
	ctx context.Context, ts *database.TblUserTimespan, tags []database.TblUserTag,
) (int, error) {
	copied := *ts
	m.saved = &copied

	return 1, nil
}

func (m *timespanMockDB) UpdateUserTimespan(ctx context.Context, ts *database.TblUserTimespan) error {
	copied := *ts
	m.saved = &copied

	return nil
}
