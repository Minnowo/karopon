// Tag create and rename report field problems at once and nothing is saved;
// renaming onto an existing tag without merge is an already-exists problem.

package v1

import (
	"context"
	"karopon/src/api"
	"karopon/src/database"
	"karopon/src/database/mock_db"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTagNewReportsEveryFieldError(t *testing.T) {

	a := newTestAPI(&mock_db.BaseMockDB{})

	rr := sendAsUser(t, a.newUserTag, `{"namespace":" ","name":""}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/namespace", "#/name"}, problemPointers(t, rr))

	rr = sendAsUser(t, a.newUserTag, `{"namespace":"`+strings.Repeat("n", 129)+`","name":"ok"}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/namespace"}, problemPointers(t, rr))
}

func TestTagLengthCountsCharacters(t *testing.T) {

	db := &tagCreateMockDB{}

	// 128 three-byte characters fit the 128-character column.
	rr := sendAsUser(t, newTestAPI(db).newUserTag, `{"namespace":"work","name":"`+strings.Repeat("\u6c34", 128)+`"}`)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}

func TestTagNewDuplicate(t *testing.T) {

	db := &tagCreateMockDB{err: database.ErrAlreadyExists}
	rr := sendAsUser(t, newTestAPI(db).newUserTag, `{"namespace":"work","name":"desk"}`)

	require.Equal(t, http.StatusConflict, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, api.ProblemTypeAlreadyExists, p.Type)
	require.Len(t, p.Errors, 1)
	assert.Equal(t, "#/name", p.Errors[0].Pointer)
}

// tagCreateMockDB accepts new tags, or fails with err.
type tagCreateMockDB struct {
	mock_db.BaseMockDB

	err error
}

func (m *tagCreateMockDB) AddUserTag(ctx context.Context, tag *database.TblUserTag) (int, error) {
	if m.err != nil {
		return 0, m.err
	}

	return 1, nil
}

func TestTagRenameReportsFieldErrors(t *testing.T) {

	a := newTestAPI(&mock_db.BaseMockDB{})

	rr := sendAsUser(t, a.updateUserTag, `{"namespace":"work","name":"desk","new_namespace":"","new_name":" "}`)
	require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	assert.Equal(t, []string{"#/new_namespace", "#/new_name"}, problemPointers(t, rr))
}

func TestTagRenameOntoExistingTag(t *testing.T) {

	rr := sendAsUser(t, newTestAPI(&tagExistsMockDB{}).updateUserTag,
		`{"namespace":"work","name":"desk","new_namespace":"work","new_name":"office"}`)

	require.Equal(t, http.StatusConflict, rr.Code)
	p := decodeProblem(t, rr)
	assert.Equal(t, api.ProblemTypeAlreadyExists, p.Type)
	require.Len(t, p.Errors, 1)
	assert.Equal(t, "#/new_name", p.Errors[0].Pointer)
}

// tagExistsMockDB answers every rename as if the new tag already exists.
type tagExistsMockDB struct {
	mock_db.BaseMockDB
}

func (m *tagExistsMockDB) UpdateUserTag(
	ctx context.Context, userID int, namespace, name, newNamespace, newName string, merge bool,
) error {
	return database.ErrTagAlreadyExists
}
