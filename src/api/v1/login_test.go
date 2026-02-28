package v1

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"karopon/src/api/auth"
	"karopon/src/api/userreg"
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/database/mock_db"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// loginMockDB is a minimal DB mock for login/logout handler tests.
// Override the function fields for the methods a given test needs.
type loginMockDB struct {
	mock_db.BaseMockDB
	loadUser      func(ctx context.Context, username string, user *database.TblUser) error
	addSession    func(ctx context.Context, session *database.TblUserSession) error
	deleteSession func(ctx context.Context, token []byte) error
}

func (m *loginMockDB) LoadUser(ctx context.Context, username string, user *database.TblUser) error {
	return m.loadUser(ctx, username, user)
}

func (m *loginMockDB) AddUserSession(ctx context.Context, session *database.TblUserSession) error {
	return m.addSession(ctx, session)
}

func (m *loginMockDB) DeleteUserSessionByToken(ctx context.Context, token []byte) error {
	return m.deleteSession(ctx, token)
}

func (m *loginMockDB) DeleteUserSessionsExpireAfter(ctx context.Context, _ time.Time) error {
	return nil
}

// newLoginRequest builds a multipart/form-data POST for the login endpoint.
func newLoginRequest(t *testing.T, username, password, tokenType string) *http.Request {
	t.Helper()

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.WriteField("pon_username", username))
	require.NoError(t, w.WriteField("pon_password", password))
	if tokenType != "" {
		require.NoError(t, w.WriteField("pon_token_type", tokenType))
	}
	require.NoError(t, w.Close())

	req, err := http.NewRequest(http.MethodPost, "/api/login", &body)
	require.NoError(t, err)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

// newTestAPI builds an APIV1 with a real UserRegistry backed by the given mock DB.
func newTestAPI(db database.DB) *APIV1 {
	return &APIV1{
		Db:      db,
		UserReg: userreg.NewRegistry(db),
	}
}

// hashPassword returns a bcrypt hash of the given password using the minimum cost.
func hashPassword(t *testing.T, password string) []byte {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	require.NoError(t, err)
	return hash
}

// ---- Login tests ----

func TestLogin_EmptyUsername(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "", "password123", ""))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_EmptyPassword(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "alice", "", ""))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_UsernameTooLong(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	longName := strings.Repeat("a", constants.MAX_USERNAME_LENGTH+1)
	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, longName, "password123", ""))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_PasswordTooLong(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	longPass := strings.Repeat("a", constants.MAX_USER_PASSWORD_LENGTH+1)
	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "alice", longPass, ""))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_BodyTooLarge(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	// Craft a body that exceeds MAX_LOGIN_FORM_SIZE.
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.WriteField("pon_username", strings.Repeat("x", int(constants.MAX_LOGIN_FORM_SIZE))))
	require.NoError(t, w.WriteField("pon_password", "password123"))
	require.NoError(t, w.Close())

	req, err := http.NewRequest(http.MethodPost, "/api/login", &body)
	require.NoError(t, err)
	req.Header.Set("Content-Type", w.FormDataContentType())

	rr := httptest.NewRecorder()
	a.api_login(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_UserDoesNotExist(t *testing.T) {
	db := &loginMockDB{
		loadUser: func(_ context.Context, _ string, _ *database.TblUser) error {
			return sql.ErrNoRows
		},
	}
	a := newTestAPI(db)

	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "alice", "password123", ""))

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestLogin_WrongPassword(t *testing.T) {
	db := &loginMockDB{}
	a := newTestAPI(db)
	a.UserReg.PutUser(&database.TblUser{
		ID:       1,
		Name:     "alice",
		Password: hashPassword(t, "correct_password"),
	})

	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "alice", "wrong_password", ""))

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestLogin_Success_SetsCookie(t *testing.T) {
	db := &loginMockDB{
		addSession: func(_ context.Context, _ *database.TblUserSession) error { return nil },
	}
	a := newTestAPI(db)
	a.UserReg.PutUser(&database.TblUser{
		ID:                       1,
		Name:                     "alice",
		Password:                 hashPassword(t, "correct_password"),
		SessionExpireTimeSeconds: 3600,
	})

	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "alice", "correct_password", ""))

	assert.Equal(t, http.StatusOK, rr.Code)

	var sessionCookie *http.Cookie
	for _, c := range rr.Result().Cookies() {
		if c.Name == constants.SESSION_COOKIE {
			sessionCookie = c
		}
	}
	require.NotNil(t, sessionCookie, "session cookie should be set")
	assert.NotEmpty(t, sessionCookie.Value)
}

func TestLogin_Success_ReturnsTokenJSON(t *testing.T) {
	db := &loginMockDB{
		addSession: func(_ context.Context, _ *database.TblUserSession) error { return nil },
	}
	a := newTestAPI(db)
	a.UserReg.PutUser(&database.TblUser{
		ID:                       1,
		Name:                     "alice",
		Password:                 hashPassword(t, "correct_password"),
		SessionExpireTimeSeconds: 3600,
	})

	rr := httptest.NewRecorder()
	a.api_login(rr, newLoginRequest(t, "alice", "correct_password", "token"))

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")

	var resp struct {
		Token   string `json:"token"`
		Type    string `json:"type"`
		Expires int64  `json:"expires"`
	}
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&resp))
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, "Bearer", resp.Type)
	assert.NotZero(t, resp.Expires)
}

// ---- Logout tests ----

func TestLogout_NoUser_Redirects(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	req, err := http.NewRequest(http.MethodGet, "/api/logout", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	a.getLogout(rr, req)

	assert.Equal(t, http.StatusSeeOther, rr.Code)
	assert.Equal(t, "/", rr.Header().Get("Location"))
}

func TestLogout_WithUser_NoCookie_Redirects(t *testing.T) {
	a := newTestAPI(&loginMockDB{})

	req, err := http.NewRequest(http.MethodGet, "/api/logout", nil)
	require.NoError(t, err)
	req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})

	rr := httptest.NewRecorder()
	a.getLogout(rr, req)

	assert.Equal(t, http.StatusSeeOther, rr.Code)
	assert.Equal(t, "/", rr.Header().Get("Location"))
}

func TestLogout_WithUser_WithCookie_ExpiresToken(t *testing.T) {
	var deletedToken []byte
	db := &loginMockDB{
		addSession: func(_ context.Context, _ *database.TblUserSession) error { return nil },
		deleteSession: func(_ context.Context, token []byte) error {
			deletedToken = token
			return nil
		},
	}
	a := newTestAPI(db)

	user := &database.TblUser{ID: 1, Name: "alice", SessionExpireTimeSeconds: 3600}
	a.UserReg.PutUser(user)

	token, _, err := a.UserReg.NewToken(context.Background(), user.ID, user.SessionExpireTimeSeconds)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodGet, "/api/logout", nil)
	require.NoError(t, err)
	req.AddCookie(&http.Cookie{Name: constants.SESSION_COOKIE, Value: token.String()})
	req = auth.PutUser(req, user)

	rr := httptest.NewRecorder()
	a.getLogout(rr, req)

	assert.Equal(t, http.StatusSeeOther, rr.Code)
	assert.Equal(t, "/", rr.Header().Get("Location"))
	assert.NotNil(t, deletedToken, "session token should have been deleted from DB")

	// Both auth cookies should be expired.
	expiredCount := 0
	for _, c := range rr.Result().Cookies() {
		if c.Name == constants.SESSION_COOKIE || c.Name == constants.SESSION_VALID_COOKIE {
			assert.True(t, c.MaxAge < 0 || c.Expires.Before(time.Now()),
				"cookie %q should be expired", c.Name)
			expiredCount++
		}
	}
	assert.Equal(t, 2, expiredCount, "both auth cookies should be cleared")
}
