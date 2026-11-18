// Tests for POST /api/food/update: every field problem is reported at once.

package v1

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"karopon/src/database/mock_db"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateUserFoodReportsEveryFieldError(t *testing.T) {

	req := httptest.NewRequest(http.MethodPost, "/api/food/update",
		strings.NewReader(`{"id":3,"name":" ","unit":"","portion":0}`))
	req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})
	rr := httptest.NewRecorder()

	newTestAPI(&foodMockDB{}).updateUserFood(rr, req)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/name", "#/unit", "#/portion"}, problemPointers(t, rr))
}

func TestUpdateUserFoodSaves(t *testing.T) {

	db := &foodMockDB{}
	rr := sendAsUser(t, newTestAPI(db).updateUserFood, `{"id":3,"name":" Rice ","unit":"g","portion":2,"carb":10}`)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	require.NotNil(t, db.updated)
	assert.Equal(t, "Rice", db.updated.Name)
}

func TestEventFoodLogsRejectsBadCount(t *testing.T) {

	req := httptest.NewRequest(http.MethodGet, "/api/eventfoodlogs?n=lots", nil)
	req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})
	rr := httptest.NewRecorder()

	newTestAPI(&mock_db.BaseMockDB{}).getUserEventFoodLogs(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Equal(t, api.ProblemContentType, rr.Header().Get("Content-Type"))
}
