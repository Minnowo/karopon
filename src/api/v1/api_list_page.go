// Paging query parameters shared by the list endpoints.

package v1

import (
	"errors"
	"math"
	"net/http"
	"strconv"
)

var errBadListPage = errors.New("bad list page parameters")

// parseListPage reads the "n" and "offset" query parameters of a list
// request: at most n items, newest first, after skipping offset items. A
// missing or zero n means defaultN, a negative n means no limit, and a missing
// offset means 0. A non-number or a negative offset is an error.
func parseListPage(r *http.Request, defaultN int) (int, int, error) {

	n := defaultN
	offset := 0
	query := r.URL.Query()

	if raw := query.Get("n"); raw != "" {

		parsed, err := strconv.Atoi(raw)

		if err != nil {
			return 0, 0, errBadListPage
		}

		switch {
		case parsed < 0:
			n = math.MaxInt
		case parsed > 0:
			n = parsed
		}
	}

	if raw := query.Get("offset"); raw != "" {

		parsed, err := strconv.Atoi(raw)

		if err != nil || parsed < 0 {
			return 0, 0, errBadListPage
		}

		offset = parsed
	}

	return n, offset, nil
}
