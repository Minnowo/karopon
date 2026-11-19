// Settings (user update) report every field problem at once, and a user name
// taken by someone else is an already-exists problem.

package v1

import (
	"context"
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"maps"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// validNumbers are settings numbers inside their ranges, for bodies that test
// other fields.
const validNumbers = `"session_expire_time_seconds":864000,"event_history_fetch_limit":50,` +
	`"timespan_history_fetch_limit":50,`

// userMockDB answers whether a user name is taken and accepts updates.
type userMockDB struct {
	mock_db.BaseMockDB

	taken bool
}

func (m *userMockDB) UsernameTaken(ctx context.Context, userID int, username string) (bool, error) {
	return m.taken, nil
}

func (m *userMockDB) UpdateUser(ctx context.Context, user *database.TblUser) error {
	return nil
}

func TestUserUpdateReportsEveryFieldError(t *testing.T) {

	body := `{"user":{` + validNumbers + `"name":"  ","custom_css":"` + strings.Repeat(
		"a",
		constants.MAX_CUSTOM_CSS_SIZE+1,
	) +
		`"},"new_password":"` + strings.Repeat(
		"p",
		constants.MAX_USER_PASSWORD_LENGTH+1,
	) + `"}`
	rr := updateUserAs(t, &userMockDB{}, body)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/user/name", "#/user/custom_css", "#/new_password"}, problemPointers(t, rr))
}

func TestUserUpdateNameLengthCountsCharacters(t *testing.T) {

	// 20 three-byte characters are within the 20-character limit.
	rr := updateUserAs(
		t,
		&userMockDB{},
		`{"user":{`+validNumbers+`"name":"`+strings.Repeat(
			"\u6c34",
			constants.MAX_USERNAME_LENGTH,
		)+`"}}`,
	)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}

func TestUserUpdateTakenNameIsReportedWithOtherProblems(t *testing.T) {

	body := `{"user":{` + validNumbers + `"name":"bob","custom_css":"` + strings.Repeat(
		"a",
		constants.MAX_CUSTOM_CSS_SIZE+1,
	) + `"}}`
	rr := updateUserAs(t, &userMockDB{taken: true}, body)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/user/name", "#/user/custom_css"}, problemPointers(t, rr))
}

func TestUserUpdateNameTaken(t *testing.T) {

	rr := updateUserAs(
		t,
		&userMockDB{taken: true},
		`{"user":{`+validNumbers+`"name":"bob"}}`,
	)

	require.Equal(t, http.StatusConflict, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, api.ProblemTypeAlreadyExists, p.Type)
	require.Len(t, p.Errors, 1)
	assert.Equal(t, "#/user/name", p.Errors[0].Pointer)
}

// updateUserAs posts body to the user update handler as alice.
func updateUserAs(t *testing.T, db database.DB, body string) *httptest.ResponseRecorder {

	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/api/user/update", strings.NewReader(body))
	req = auth.PutUser(req, &database.TblUser{ID: 1, Name: "alice"})
	rr := httptest.NewRecorder()

	newTestAPI(db).updateUser(rr, req)

	return rr
}

// settingsBody returns a valid user update body with the given fields
// changed, so a test changes one setting at a time.
func settingsBody(t *testing.T, changes map[string]any) string {

	t.Helper()

	user := map[string]any{
		"name":                         "alice",
		"show_diabetes":                true,
		"target_blood_sugar":           5.6,
		"insulin_sensitivity_factor":   3,
		"event_log_trailing_rows":      3,
		"event_history_fetch_limit":    50,
		"timespan_history_fetch_limit": 50,
		"session_expire_time_seconds":  864000,
		"day_time_offset_seconds":      0,
	}
	maps.Copy(user, changes)

	b, err := json.Marshal(map[string]any{"user": user})
	require.NoError(t, err)

	return string(b)
}

func TestUserUpdateAcceptsValidSettings(t *testing.T) {

	rr := updateUserAs(t, &userMockDB{}, settingsBody(t, nil))
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}

func TestUserUpdateChecksSettingsNumbers(t *testing.T) {

	cases := []struct {
		field string
		bad   []any
		good  []any
	}{
		{"target_blood_sugar", []any{0, -5, 1000.5}, []any{0.1, 5.6, 100, 1000}},
		{"insulin_sensitivity_factor", []any{0, -1, 1001}, []any{0.5, 3, 50}},
		{"event_log_trailing_rows", []any{-1, 21}, []any{0, 3, 20}},
		{"event_history_fetch_limit", []any{0, -1, 1001}, []any{1, 50, 1000}},
		{"timespan_history_fetch_limit", []any{0, -1, 1001}, []any{1, 50, 1000}},
		{
			"session_expire_time_seconds",
			[]any{0, -1, 59, 3599, 315360001, int64(31536000000000000)},
			[]any{3600, 864000, 315360000},
		},
		{"day_time_offset_seconds", []any{86400, -1, -7200, 100000}, []any{0, 14400, 86399}},
	}

	for _, c := range cases {
		for _, v := range c.bad {
			rr := updateUserAs(t, &userMockDB{}, settingsBody(t, map[string]any{c.field: v}))
			require.Equal(t, http.StatusUnprocessableEntity, rr.Code, "%s=%v", c.field, v)
			assert.Equal(t, []string{"#/user/" + c.field}, problemPointers(t, rr), "%s=%v", c.field, v)
		}
		for _, v := range c.good {
			rr := updateUserAs(t, &userMockDB{}, settingsBody(t, map[string]any{c.field: v}))
			require.Equal(t, http.StatusOK, rr.Code, "%s=%v: %s", c.field, v, rr.Body.String())
		}
	}
}

// The diabetes fields are hidden while the diabetes settings are off, so
// their values are not checked then.
func TestUserUpdateSkipsHiddenDiabetesFields(t *testing.T) {

	body := settingsBody(t, map[string]any{
		"show_diabetes":              false,
		"insulin_sensitivity_factor": 0,
		"target_blood_sugar":         -1,
	})

	rr := updateUserAs(t, &userMockDB{}, body)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}
