// Settings (user update) report every field problem at once, and a user name
// taken by someone else is an already-exists problem.

package v1

import (
	"context"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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

	body := `{"user":{"name":"  ","custom_css":"` + strings.Repeat("a", constants.MAX_CUSTOM_CSS_SIZE+1) +
		`"},"new_password":"` + strings.Repeat("p", constants.MAX_USER_PASSWORD_LENGTH+1) + `"}`
	rr := updateUserAs(t, &userMockDB{}, body)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/user/name", "#/user/custom_css", "#/new_password"}, problemPointers(t, rr))
}

func TestUserUpdateNameLengthCountsCharacters(t *testing.T) {

	// 20 three-byte characters are within the 20-character limit.
	rr := updateUserAs(
		t,
		&userMockDB{},
		`{"user":{"name":"`+strings.Repeat("\u6c34", constants.MAX_USERNAME_LENGTH)+`"}}`,
	)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}

func TestUserUpdateTakenNameIsReportedWithOtherProblems(t *testing.T) {

	body := `{"user":{"name":"bob","custom_css":"` + strings.Repeat("a", constants.MAX_CUSTOM_CSS_SIZE+1) + `"}}`
	rr := updateUserAs(t, &userMockDB{taken: true}, body)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/user/name", "#/user/custom_css"}, problemPointers(t, rr))
}

func TestUserUpdateNameTaken(t *testing.T) {

	rr := updateUserAs(t, &userMockDB{taken: true}, `{"user":{"name":"bob"}}`)

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
