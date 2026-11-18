// Tests for body log and body metric validation: problems are reported as
// field errors, and nothing is saved.

package v1

import (
	"context"
	"net/http"
	"testing"

	"karopon/src/api"
	"karopon/src/database"
	"karopon/src/database/mock_db"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBodyLogNeedsAValue(t *testing.T) {

	a := newTestAPI(&mock_db.BaseMockDB{})

	cases := []struct {
		name    string
		handler http.HandlerFunc
		body    string
	}{
		{"new", a.createUserBodyLog, `{"bodylog":{},"metrics":[]}`},
		{"update", a.updateUserBodyLog, `{"bodylog":{"id":3},"metrics":[]}`},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			// BaseMockDB panics on any call, so reaching the database fails the test.
			rr := sendAsUser(t, c.handler, c.body)

			require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
			assert.Equal(t, []string{"#/metrics"}, problemPointers(t, rr))
		})
	}
}

func TestBodyMetricNeedsAName(t *testing.T) {

	rr := sendAsUser(t, newTestAPI(&mock_db.BaseMockDB{}).createUserBodyMetric, `{"name":"  ","unit":"kg"}`)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/name"}, problemPointers(t, rr))
}

func TestBodyLogWithDeletedMetricAsksForReload(t *testing.T) {

	rr := sendAsUser(t, newTestAPI(&staleMetricMockDB{}).createUserBodyLog,
		`{"bodylog":{},"metrics":[{"body_metric_id":9,"value":70}]}`)

	assert.Equal(t, http.StatusConflict, rr.Code)
	assert.Equal(t, api.ProblemContentType, rr.Header().Get("Content-Type"))
}

// staleMetricMockDB answers as if a body metric in the request was deleted.
type staleMetricMockDB struct {
	mock_db.BaseMockDB
}

func (m *staleMetricMockDB) AddUserBodyLogs(ctx context.Context, entry *database.UserBodyLog) (int, error) {
	return 0, database.ErrInvalidBodyMetric
}
