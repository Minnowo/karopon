// Validation shared by creating and renaming a tag.

package v1

import (
	"fmt"
	"karopon/src/api"
	"unicode/utf8"
)

// validateTagParts returns one field problem per part of a tag that cannot be
// saved. namespace and name must already be trimmed; nsPointer and namePointer
// are where the two parts are in the request, such as "#/namespace".
func validateTagParts(namespace string, name string, nsPointer string, namePointer string) []api.FieldProblem {

	var errs []api.FieldProblem

	tooLong := fmt.Sprintf("Use at most %d characters.", maxTagPartLength)

	switch {
	case len(namespace) == 0:
		errs = append(errs, api.FieldProblem{Pointer: nsPointer, Detail: "Enter a namespace, such as work."})
	case utf8.RuneCountInString(namespace) > maxTagPartLength:
		errs = append(errs, api.FieldProblem{Pointer: nsPointer, Detail: tooLong})
	}

	switch {
	case len(name) == 0:
		errs = append(errs, api.FieldProblem{Pointer: namePointer, Detail: "Enter a name, such as desk."})
	case utf8.RuneCountInString(name) > maxTagPartLength:
		errs = append(errs, api.FieldProblem{Pointer: namePointer, Detail: tooLong})
	}

	return errs
}
