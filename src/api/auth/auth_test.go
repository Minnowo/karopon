package auth

import (
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/handlers/user"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

func init() {
	// config.InitLogging()
}

func expectContext(t *testing.T, expectUser *database.TblUser, yes bool) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {

		user := GetUser(r)

		if yes {
			assert.True(t, user != nil, "expected user in context")
			assert.Equal(t, expectUser.Name, user.Name, "expected username to match")
		} else {
			assert.True(t, user == nil, "expected no user in context")
		}
	}
}

func TestAuthMiddleware(t *testing.T) {

	username := "test"
	password := "test"

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	assert.Nil(t, err)

	session := &database.TblUser{
		Name:     username,
		Password: passwordHash,
		Created:  database.UnixMillis(time.Now()),
	}

	reg := user.NewRegistry()
	reg.AddUser(*session)

	authToken, ok := reg.Login(username, password)
	assert.True(t, ok, "login should be valid")

	r := mux.NewRouter()
	r.PathPrefix("/no-auth").HandlerFunc(expectContext(t, session, false))

	noAuth := r.NewRoute().Subrouter()
	noAuth.Use(ParseAuth(constants.SESSION_COOKIE, reg))
	noAuth.PathPrefix("/no-require-auth1").HandlerFunc(expectContext(t, session, false))
	noAuth.PathPrefix("/no-require-auth2").HandlerFunc(expectContext(t, session, true))

	yesAuth := r.NewRoute().Subrouter()
	yesAuth.Use(ParseAuth(constants.SESSION_COOKIE, reg), RequireAuth())
	yesAuth.PathPrefix("/yes-require-auth").HandlerFunc(expectContext(t, session, true))

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
			Name:  constants.SESSION_COOKIE,
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
