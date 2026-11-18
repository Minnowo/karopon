// A create or update that would duplicate an existing row must answer 409
// with an already-exists problem that points at the name field.

package v1

import (
	"context"
	"fmt"
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

const testGoalBody = `{"id":3,"name":"Daily Weight","target_value":70,"target_col":"BODY_METRIC",` +
	`"target_metric":"Weight","aggregation_type":"AVG","value_comparison":"LESS_THAN","time_expr":"DAILY"}`

func TestDuplicatesAnswerConflict(t *testing.T) {

	a := newTestAPI(&duplicateMockDB{})

	cases := []struct {
		name    string
		handler http.HandlerFunc
		body    string
	}{
		{"food new", a.addUserFood, `{"name":"Rice","unit":"g","portion":1}`},
		{"food update", a.updateUserFood, `{"id":3,"name":"Rice","unit":"g","portion":1}`},
		{"body metric new", a.createUserBodyMetric, `{"name":"Weight","unit":"kg"}`},
		{"goal new", a.newUserGoal, testGoalBody},
		{"goal update", a.updateUserGoal, testGoalBody},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(c.body))
			req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})
			rr := httptest.NewRecorder()

			c.handler(rr, req)

			require.Equal(t, http.StatusConflict, rr.Code)
			p := decodeProblem(t, rr)
			assert.Equal(t, api.ProblemTypeAlreadyExists, p.Type)
			assert.Equal(t, http.StatusConflict, p.Status)
			require.Len(t, p.Errors, 1)
			assert.Equal(t, "#/name", p.Errors[0].Pointer)
			assert.NotEmpty(t, p.Errors[0].Detail)
		})
	}
}

// duplicateMockDB fails every write the way a backend reports a unique violation.
type duplicateMockDB struct {
	mock_db.BaseMockDB
}

var errDuplicate = fmt.Errorf("%w: unique constraint failed", database.ErrAlreadyExists)

func (m *duplicateMockDB) AddUserFood(ctx context.Context, food *database.TblUserFood) (int, error) {
	return 0, errDuplicate
}

func (m *duplicateMockDB) UpdateUserFood(ctx context.Context, food *database.TblUserFood) error {
	return errDuplicate
}

func (m *duplicateMockDB) AddUserBodyMetric(ctx context.Context, metric *database.TblUserBodyMetric) (int, error) {
	return 0, errDuplicate
}

func (m *duplicateMockDB) AddUserGoal(ctx context.Context, goal *database.TblUserGoal) (int, error) {
	return 0, errDuplicate
}

func (m *duplicateMockDB) UpdateUserGoal(ctx context.Context, goal *database.TblUserGoal) error {
	return errDuplicate
}
