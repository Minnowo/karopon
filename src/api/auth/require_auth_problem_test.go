// RequireAuth answers a request without a user with a 401 problem details body.

package auth

import (
	"karopon/src/api"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequireAuthAnswersProblem(t *testing.T) {

	handler := RequireAuth()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("the next handler must not run without a user")
	}))

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/foods", nil))

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Equal(t, api.ProblemContentType, rr.Header().Get("Content-Type"))
	assert.Contains(t, rr.Body.String(), `"detail":`)
}
