// Goal validation: every field problem is reported at once, and nothing is saved.

package v1

import (
	"net/http"
	"testing"

	"karopon/src/database/mock_db"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGoalReportsEveryFieldError(t *testing.T) {

	a := newTestAPI(&mock_db.BaseMockDB{})

	cases := []struct {
		name    string
		handler http.HandlerFunc
		body    string
	}{
		{"new", a.newUserGoal, `{"name":" ","target_value":-5,"target_col":"BODY_METRIC","target_metric":"",` +
			`"aggregation_type":"NOPE","value_comparison":"NOPE","time_expr":"???"}`},
		{
			"update",
			a.updateUserGoal,
			`{"id":3,"name":"","target_value":-5,"target_col":"BODY_METRIC","target_metric":"",` +
				`"aggregation_type":"NOPE","value_comparison":"NOPE","time_expr":"???"}`,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			rr := sendAsUser(t, c.handler, c.body)

			require.Equal(t, http.StatusUnprocessableEntity, rr.Code)
			assert.Equal(t, []string{
				"#/name",
				"#/target_value",
				"#/aggregation_type",
				"#/target_metric",
				"#/value_comparison",
				"#/time_expr",
			}, problemPointers(t, rr))
		})
	}
}
