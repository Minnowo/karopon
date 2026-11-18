// Tests for POST /api/food/new: the success path and every error response,
// which must be RFC 9457 problem details (see src/api/problem.go).

package v1

import (
	"context"
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var errFoodMockDBDown = errors.New("database is down")

func TestAddUserFoodCreates(t *testing.T) {

	db := &foodMockDB{newID: 7}
	rr := postNewFood(t, db, `{"name":" Rice ","unit":"g","portion":100,"carb":28}`)

	require.Equal(t, http.StatusOK, rr.Code)

	var food database.TblUserFood
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &food))
	assert.Equal(t, 7, food.ID)
	assert.Equal(t, "Rice", food.Name)
	assert.Equal(t, "Rice", db.added.Name)
}

func TestAddUserFoodReportsEveryFieldError(t *testing.T) {

	db := &foodMockDB{}
	rr := postNewFood(t, db, `{"name":"  ","unit":"","portion":0}`)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, api.ProblemTypeValidation, p.Type)
	assert.Equal(t, http.StatusUnprocessableEntity, p.Status)
	assert.NotEmpty(t, p.Title)
	assert.NotEmpty(t, p.Detail)

	pointers := make([]string, 0, len(p.Errors))
	for _, e := range p.Errors {
		pointers = append(pointers, e.Pointer)
		assert.NotEmpty(t, e.Detail, "detail for %s", e.Pointer)
	}
	assert.Equal(t, []string{"#/name", "#/unit", "#/portion"}, pointers)
	assert.Nil(t, db.added, "nothing may be saved when validation fails")
}

func TestAddUserFoodRejectsMalformedJSON(t *testing.T) {

	rr := postNewFood(t, &foodMockDB{}, `{"name":`)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, "", p.Type, "a plain status problem uses the default about:blank type")
	assert.Equal(t, http.StatusText(http.StatusBadRequest), p.Title)
	assert.NotEmpty(t, p.Detail)
}

func TestAddUserFoodReportsDatabaseFailure(t *testing.T) {

	rr := postNewFood(t, &foodMockDB{err: errFoodMockDBDown}, `{"name":"Rice","unit":"g","portion":1}`)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, http.StatusText(http.StatusInternalServerError), p.Title)
	assert.NotContains(t, p.Detail, errFoodMockDBDown.Error(), "internal errors stay in the log")
}

func TestAddUserFoodWithoutUser(t *testing.T) {

	req := httptest.NewRequest(http.MethodPost, "/api/food/new", strings.NewReader(`{"name":"Rice"}`))
	rr := httptest.NewRecorder()

	newTestAPI(&foodMockDB{}).addUserFood(rr, req)

	require.Equal(t, http.StatusUnauthorized, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, http.StatusText(http.StatusUnauthorized), p.Title)
	assert.NotEmpty(t, p.Detail)
}

// foodMockDB records the food passed to AddUserFood and returns newID or err.
type foodMockDB struct {
	mock_db.BaseMockDB

	newID   int
	err     error
	added   *database.TblUserFood
	updated *database.TblUserFood
}

func (m *foodMockDB) AddUserFood(ctx context.Context, food *database.TblUserFood) (int, error) {

	if m.err != nil {
		return 0, m.err
	}

	copied := *food
	m.added = &copied

	return m.newID, nil
}

func (m *foodMockDB) UpdateUserFood(ctx context.Context, food *database.TblUserFood) error {

	if m.err != nil {
		return m.err
	}

	copied := *food
	m.updated = &copied

	return nil
}

// postNewFood sends body to the add food handler as a logged-in user.
func postNewFood(t *testing.T, db database.DB, body string) *httptest.ResponseRecorder {

	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/api/food/new", strings.NewReader(body))
	req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})
	rr := httptest.NewRecorder()

	newTestAPI(db).addUserFood(rr, req)

	return rr
}
