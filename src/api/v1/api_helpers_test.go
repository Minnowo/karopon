// Helpers shared by the v1 handler tests.

package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// sendAsUser posts body to handler as a logged-in user.
func sendAsUser(t *testing.T, handler http.HandlerFunc, body string) *httptest.ResponseRecorder {

	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})
	rr := httptest.NewRecorder()

	handler(rr, req)

	return rr
}

// problemPointers decodes a validation problem and returns its pointers in order.
func problemPointers(t *testing.T, rr *httptest.ResponseRecorder) []string {

	t.Helper()

	p := decodeProblem(t, rr)
	assert.Equal(t, api.ProblemTypeValidation, p.Type)

	pointers := make([]string, 0, len(p.Errors))
	for _, e := range p.Errors {
		pointers = append(pointers, e.Pointer)
	}

	return pointers
}

// decodeProblem checks the problem+json content type and decodes the body.
func decodeProblem(t *testing.T, rr *httptest.ResponseRecorder) api.Problem {

	t.Helper()

	assert.Equal(t, api.ProblemContentType, rr.Header().Get("Content-Type"))

	var p api.Problem
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &p))

	return p
}
