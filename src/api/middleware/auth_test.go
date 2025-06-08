package middleware

import (
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/handlers/user"
	"karopon/src/logging"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

func expectContext(t *testing.T, username string, yes bool) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {

		name, ok := r.Context().Value(constants.USER_CONTEXT_KEY).(string)

		if yes {
			assert.True(t, ok, "expected user in context")
			assert.Equal(t, username, name, "expected username to match")
		} else {
			assert.False(t, ok, "expected no user in context")
		}
	}
}

func TestAuthMiddleware(t *testing.T) {

	logging.Init()

	username := "test"
	password := "test"

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	assert.Nil(t, err)

	reg := user.NewRegistry()
	reg.AddUser(database.TblUser{
		ID:       3,
		Name:     username,
		Password: passwordHash,
		Created:  time.Now(),
	})

	authToken, ok := reg.Login(username, password)
	assert.True(t, ok, "login should be valid")

	r := mux.NewRouter()
	r.PathPrefix("/no-auth").HandlerFunc(expectContext(t, username, false))

	noAuth := r.NewRoute().Subrouter()
	noAuth.Use(Auth(reg))
	noAuth.PathPrefix("/no-require-auth1").HandlerFunc(expectContext(t, username, false))
	noAuth.PathPrefix("/no-require-auth2").HandlerFunc(expectContext(t, username, true))

	yesAuth := r.NewRoute().Subrouter()
	yesAuth.Use(Auth(reg), RequireAuth())
	yesAuth.PathPrefix("/yes-require-auth").HandlerFunc(expectContext(t, username, true))

	t.Run("test no auth route", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/no-auth", nil)

		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected 200 ok")
	})

	t.Run("test no-require-auth1", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/no-require-auth1", nil)

		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected 200 ok")
	})

	t.Run("test no-require-auth2", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/no-require-auth2", nil)
		req.AddCookie(&http.Cookie{
			Name:  config.SESSION_COOKIE,
			Value: authToken,
		})

		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected 200 ok")
	})

	t.Run("test yes-require-auth failed login", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/yes-require-auth", nil)

		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusUnauthorized, rr.Result().StatusCode, "expected 401")
	})

	t.Run("test yes-require-auth good login", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/yes-require-auth", nil)
		req.AddCookie(&http.Cookie{
			Name:  constants.SESSION_COOKIE,
			Value: authToken,
		})

		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected unauthorized")
	})
}
