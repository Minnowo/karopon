// Tests for the panic recovery middleware in recover.go.

package middleware

import (
	"karopon/src/api"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

func TestRecover(t *testing.T) {

	r := mux.NewRouter()
	r.Use(Recoverer)

	r.PathPrefix("/").HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("some panic!")
	})

	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Equal(t, api.ProblemContentType, rr.Header().Get("Content-Type"))
	assert.Contains(t, rr.Body.String(), `"detail":`)
}

func TestRecoverAfterWriteAddsNothing(t *testing.T) {

	r := mux.NewRouter()
	r.Use(Recoverer)

	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"partial":`))
		panic("some panic!")
	})

	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	assert.Equal(t, `{"partial":`, rr.Body.String(), "a started response must not get a problem appended")
}
