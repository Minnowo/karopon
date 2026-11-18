// Tests for the problem details writer in problem.go.

package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWriteProblemReplacesUnusableStatus(t *testing.T) {

	for _, status := range []int{0, 99, 1000, -1} {

		rr := httptest.NewRecorder()
		WriteProblem(rr, Problem{Title: "x", Status: status, Detail: "Something went wrong."})

		require.Equal(t, http.StatusInternalServerError, rr.Code, "status %d", status)

		var p Problem
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &p))
		assert.Equal(t, http.StatusInternalServerError, p.Status, "body status must match the response")
	}
}
