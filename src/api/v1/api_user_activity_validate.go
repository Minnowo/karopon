// Validation shared by creating and updating an activity.

package v1

import (
	"fmt"
	"karopon/src/api"
	"unicode/utf8"
)

// Column sizes in PostgreSQL: USER_ACTIVITY.NAME (pg/0025) and USER_TAG.NAMESPACE/NAME (pg/0010).
const (
	maxActivityNameLength = 255
	maxTagPartLength      = 128
)

// validateActivity returns one field problem per activity field that cannot
// be saved. The arguments must already be trimmed.
func validateActivity(name string, tagNamespace string, tagName string, duration int) []api.FieldProblem {

	var errs []api.FieldProblem

	if len(name) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/name", Detail: "Enter a name for the activity."})
	} else if utf8.RuneCountInString(name) > maxActivityNameLength {
		errs = append(errs, api.FieldProblem{
			Pointer: "#/name",
			Detail:  fmt.Sprintf("Use a name of at most %d characters.", maxActivityNameLength),
		})
	}

	if len(tagNamespace) == 0 || len(tagName) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/tag_name", Detail: "Choose a tag for the activity."})
	} else if tagPartTooLong(tagNamespace) || tagPartTooLong(tagName) {
		errs = append(errs, api.FieldProblem{
			Pointer: "#/tag_name",
			Detail:  fmt.Sprintf("Use a tag of at most %d characters on each side of the colon.", maxTagPartLength),
		})
	}

	if duration <= 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/duration", Detail: "Duration must be more than 0."})
	}

	return errs
}

// tagPartTooLong reports whether part is longer than its database column, in characters.
func tagPartTooLong(part string) bool {
	return utf8.RuneCountInString(part) > maxTagPartLength
}
