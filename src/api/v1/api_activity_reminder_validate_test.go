// Activity and reminder validation: every field problem is reported at once
// as a field error, and nothing is saved.

package v1

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"karopon/src/database"
	"karopon/src/database/mock_db"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestActivityReportsEveryFieldError(t *testing.T) {

	a := newTestAPI(&mock_db.BaseMockDB{})

	cases := []struct {
		name    string
		handler http.HandlerFunc
		body    string
	}{
		{"new", a.addUserActivity, `{"name":" ","tag_namespace":"","tag_name":"","duration":0}`},
		{"update", a.updateUserActivity, `{"id":3,"name":"","tag_namespace":"work","tag_name":"","duration":-5}`},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			// BaseMockDB panics on any call, so reaching the database fails the test.
			rr := sendAsUser(t, c.handler, c.body)

			require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
			assert.Equal(t, []string{"#/name", "#/tag_name", "#/duration"}, problemPointers(t, rr))
		})
	}
}

func TestActivityRejectsLongNames(t *testing.T) {

	body := `{"name":"` + strings.Repeat("x", 256) + `","tag_namespace":"work","tag_name":"` +
		strings.Repeat("y", 129) + `","duration":5}`
	rr := sendAsUser(t, newTestAPI(&mock_db.BaseMockDB{}).addUserActivity, body)

	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/name", "#/tag_name"}, problemPointers(t, rr))
}

func TestReminderReportsFieldErrors(t *testing.T) {

	a := newTestAPI(&mock_db.BaseMockDB{})
	rr := sendAsUser(t, a.addUserReminder, `{"reminder":{"interval_minutes":0,"name":"`+strings.Repeat("x", 200)+`"}}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/reminder/interval_minutes", "#/reminder/name"}, problemPointers(t, rr))

	rr = sendAsUser(t, a.addUserReminder, `{"reminder":{"interval_minutes":30,"name":"  "}}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/reminder/name"}, problemPointers(t, rr))

	rr = sendAsUser(t, a.updateUserReminder, `{"id":3,"interval_minutes":-1,"name":"`+strings.Repeat("x", 200)+`"}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/interval_minutes", "#/name"}, problemPointers(t, rr))
}

func TestReminderUpdateAllowsAnEmptyName(t *testing.T) {

	db := &reminderMockDB{}
	rr := sendAsUser(t, newTestAPI(db).updateUserReminder, `{"id":3,"interval_minutes":30,"name":""}`)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	assert.True(t, db.updated)
}

// reminderMockDB accepts reminder updates.
type reminderMockDB struct {
	mock_db.BaseMockDB

	updated bool
}

func (m *reminderMockDB) UpdateUserReminder(ctx context.Context, reminder *database.TblUserReminder) error {
	m.updated = true

	return nil
}
