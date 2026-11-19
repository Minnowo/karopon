// Tests for the n and offset query parameters of the list endpoints.

package v1

import (
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseListPage(t *testing.T) {

	cases := []struct {
		query  string
		n      int
		offset int
	}{
		{"", 50, 0},
		{"?n=0", 50, 0},
		{"?n=10", 10, 0},
		{"?n=-1", math.MaxInt, 0},
		{"?n=25&offset=75", 25, 75},
		{"?offset=0", 50, 0},
	}

	for _, c := range cases {
		n, offset, err := parseListPage(httptest.NewRequest(http.MethodGet, "/x"+c.query, nil), 50)
		require.NoError(t, err, c.query)
		assert.Equal(t, c.n, n, c.query)
		assert.Equal(t, c.offset, offset, c.query)
	}
}

func TestParseListPageRejectsBadValues(t *testing.T) {

	for _, query := range []string{"?n=ten", "?offset=-1", "?offset=x", "?n=1.5"} {
		_, _, err := parseListPage(httptest.NewRequest(http.MethodGet, "/x"+query, nil), 50)
		assert.Error(t, err, query)
	}
}
