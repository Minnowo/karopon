// Every authenticated handler must answer a request without a logged-in user
// with a 401 problem details body, even if the auth middleware is bypassed.

package v1

import (
	"karopon/src/api"
	"karopon/src/database/mock_db"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// noUserExempt lists routes that are meant to work without a user.
var noUserExempt = map[string]bool{
	"/api/login":  true,
	"/api/logout": true,
}

func TestHandlersWithoutUserAnswerUnauthorized(t *testing.T) {

	r := mux.NewRouter()
	newTestAPI(&mock_db.BaseMockDB{}).Register(r)

	checked := 0

	err := r.Walk(func(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {

		handler := route.GetHandler()
		path, err := route.GetPathTemplate()

		if handler == nil || err != nil || noUserExempt[path] {
			return nil //nolint:nilerr // routes without a handler or a template are subrouters; skip them
		}

		t.Run(path, func(t *testing.T) {

			// Handlers that check the user first never read the body or the path variables.
			req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{}`))
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusUnauthorized, rr.Code)
			assert.Equal(t, api.ProblemContentType, rr.Header().Get("Content-Type"))
		})

		checked++

		return nil
	})

	require.NoError(t, err)
	assert.Greater(t, checked, 50, "the walk must reach the registered handlers")
}
