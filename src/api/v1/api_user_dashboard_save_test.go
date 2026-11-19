// Tests for saving a dashboard (a view on the stats page): it needs a name,
// on create and on rename.

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

// dashboardMockDB keeps the dashboard it was asked to save.
type dashboardMockDB struct {
	mock_db.BaseMockDB

	saved *database.TblUserDashboard
}

func (m *dashboardMockDB) AddUserDashboard(_ context.Context, d *database.TblUserDashboard) (int, error) {
	m.saved = d
	return 7, nil
}

func (m *dashboardMockDB) UpdateUserDashboard(_ context.Context, d *database.TblUserDashboard) error {
	m.saved = d
	return nil
}

func TestDashboardNeedsAName(t *testing.T) {

	for _, body := range []string{`{"name":"","data":"[]"}`, `{"name":"   ","data":"[]"}`} {

		db := &dashboardMockDB{}
		api := newTestAPI(db)

		for _, handler := range []http.HandlerFunc{api.newUserDashboard, api.updateUserDashboard} {
			rr := sendAsUser(t, handler, body)
			require.Equal(t, http.StatusUnprocessableEntity, rr.Code, body)
			assert.Equal(t, []string{"#/name"}, problemPointers(t, rr))
		}
		assert.Nil(t, db.saved, "nothing may be saved without a name")
	}
}

func TestDashboardNameIsTrimmed(t *testing.T) {

	db := &dashboardMockDB{}
	rr := sendAsUser(t, newTestAPI(db).newUserDashboard, `{"name":"  Main  ","data":"[]"}`)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	require.NotNil(t, db.saved)
	assert.Equal(t, "Main", db.saved.Name)
}
