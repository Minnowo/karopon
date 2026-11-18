// Error responses as RFC 9457 problem details (https://www.rfc-editor.org/rfc/rfc9457).
// The problem types Karopon defines are documented in docs/api-errors.md.

package api

import (
	"encoding/json"
	"net/http"
)

// ProblemContentType is the media type of every error response body.
const ProblemContentType = "application/problem+json"

// ProblemTypeValidation identifies a request whose fields need fixing. Its
// problems carry an Errors list, one entry per field.
const ProblemTypeValidation = "https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#validation-error"

// ProblemTypeAlreadyExists identifies a create or update that would duplicate
// something the user already has. Like validation problems it carries an
// Errors list naming the field to change.
const ProblemTypeAlreadyExists = "https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#already-exists"

const validationTitle = "Some values need to be changed."
const validationDetail = "Check the highlighted fields and try again."

// Problem is a problem details object. An empty Type means "about:blank": the
// problem means no more than its HTTP status, and Title is the status phrase.
// Detail is written for the user and says what to do; it never carries
// internal errors.
type Problem struct {
	Type   string         `json:"type,omitempty"`
	Title  string         `json:"title"`
	Status int            `json:"status"`
	Detail string         `json:"detail,omitempty"`
	Errors []FieldProblem `json:"errors,omitempty"`
}

// FieldProblem is one entry of Problem.Errors. Pointer is a JSON Pointer in
// URI fragment form into the request body, such as "#/portion"; Detail is
// the message shown next to that field.
type FieldProblem struct {
	Detail  string `json:"detail"`
	Pointer string `json:"pointer"`
}

// WriteProblem writes p as the response, with p.Status as the HTTP status.
// A status outside 100-999, which net/http would panic on, is sent as 500.
func WriteProblem(w http.ResponseWriter, p Problem) {

	if p.Status < 100 || p.Status > 999 {
		logger.Warn().Int("status", p.Status).Msg("problem with an unusable status, sending 500")
		p.Status = http.StatusInternalServerError
	}

	logger.Debug().Int("status", p.Status).Str("type", p.Type).Str("detail", p.Detail).Msg("problem response")

	w.Header().Set("Content-Type", ProblemContentType)
	w.WriteHeader(p.Status)

	err := json.NewEncoder(w).Encode(p)

	if err != nil {
		logger.Debug().Err(err).Msg("error while writing problem response")
	}
}

// WriteStatusProblem writes an about:blank problem for status with a
// user-facing detail message.
func WriteStatusProblem(w http.ResponseWriter, status int, detail string) {
	WriteProblem(w, Problem{
		Title:  http.StatusText(status),
		Status: status,
		Detail: detail,
	})
}

// WriteValidationProblem writes a 422 validation problem listing errs.
// Callers collect every field error before calling it, so the user can fix
// them all at once.
func WriteValidationProblem(w http.ResponseWriter, errs []FieldProblem) {
	WriteProblem(w, Problem{
		Type:   ProblemTypeValidation,
		Title:  validationTitle,
		Status: http.StatusUnprocessableEntity,
		Detail: validationDetail,
		Errors: errs,
	})
}

// WriteAlreadyExistsProblem writes a 409 already-exists problem with err as
// its only field error.
func WriteAlreadyExistsProblem(w http.ResponseWriter, err FieldProblem) {
	WriteProblem(w, Problem{
		Type:   ProblemTypeAlreadyExists,
		Title:  "This already exists.",
		Status: http.StatusConflict,
		Detail: err.Detail,
		Errors: []FieldProblem{err},
	})
}

// WriteNoUserProblem answers a request that reached a handler without a
// logged-in user.
func WriteNoUserProblem(w http.ResponseWriter) {
	WriteStatusProblem(w, http.StatusUnauthorized, "Log in again to continue.")
}

// WriteUnreadableProblem answers a request whose body could not be decoded.
// That is a client bug or a stale page, not something the user typed.
func WriteUnreadableProblem(w http.ResponseWriter) {
	WriteStatusProblem(w, http.StatusBadRequest, "The request could not be read. Reload the page and try again.")
}
