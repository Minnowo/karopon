package auth

import (
	"context"
	"karopon/src/database"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

type fakeUserReg struct {
	tokenToUsers map[string]*database.TblUser
}

func (r *fakeUserReg) CheckToken(ctx context.Context, tokenStr string) (*database.TblUser, bool) {

	usr, ok := r.tokenToUsers[tokenStr]

	return usr, ok
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

func newRouter(t *testing.T, session *database.TblUser, tokenProvider TokenProvider) *mux.Router {

	r := mux.NewRouter()
	r.PathPrefix("/no-auth").HandlerFunc(expectContext(t, session, false))

	noAuth := r.NewRoute().Subrouter()
	noAuth.Use(ParseAuth(tokenProvider))
	noAuth.PathPrefix("/no-require-auth1").HandlerFunc(expectContext(t, session, false))
	noAuth.PathPrefix("/no-require-auth2").HandlerFunc(expectContext(t, session, true))

	yesAuth := r.NewRoute().Subrouter()
	yesAuth.Use(ParseAuth(tokenProvider), RequireAuth())
	yesAuth.PathPrefix("/yes-require-auth").HandlerFunc(expectContext(t, session, true))

	return r
}

func TestAuthMiddleware(t *testing.T) {

	username := "test"
	password := "test"
	authToken := "this_is_auth_token" //nolint:gosec

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	assert.Nil(t, err)

	session := &database.TblUser{
		Name:     username,
		Password: passwordHash,
		Created:  database.TimeMillis(time.Now()),
	}

	reg := &fakeUserReg{
		tokenToUsers: make(map[string]*database.TblUser),
	}
	reg.tokenToUsers[authToken] = session

	t.Run("test no auth route", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/no-auth", nil)

		r := newRouter(t, session, reg)
		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected 200 ok")
	})

	t.Run("test no-require-auth1", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/no-require-auth1", nil)

		r := newRouter(t, session, reg)
		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected 200 ok")
	})

	t.Run("test no-require-auth2", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/no-require-auth2", nil)
		req.AddCookie(&http.Cookie{
			Name:  sessionCookie,
			Value: authToken,
		})
		req.AddCookie(&http.Cookie{
			Name:  sessionValidCookie,
			Value: authToken,
		})

		r := newRouter(t, session, reg)
		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected 200 ok")
	})

	t.Run("test yes-require-auth failed login", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/yes-require-auth", nil)

		r := newRouter(t, session, reg)
		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusUnauthorized, rr.Result().StatusCode, "expected 401")
	})

	t.Run("test yes-require-auth good login", func(t *testing.T) {

		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/yes-require-auth", nil)
		req.AddCookie(&http.Cookie{
			Name:  sessionCookie,
			Value: authToken,
		})
		req.AddCookie(&http.Cookie{
			Name:  sessionValidCookie,
			Value: authToken,
		})

		r := newRouter(t, session, reg)
		r.ServeHTTP(rr, req)

		assert := assert.New(t)
		assert.Equal(http.StatusOK, rr.Result().StatusCode, "expected unauthorized")
	})

}
