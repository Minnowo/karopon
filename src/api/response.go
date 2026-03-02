package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/minnowo/log4zero"
)

var logger = log4zero.Get("api-responses")

func Done(w http.ResponseWriter, code int, msg string) {
	logger.Debug().Int("code", code).Str("message", msg).Msg("Http Response")
	http.Error(w, msg, code)
}

func Donef(w http.ResponseWriter, code int, msg string, a ...any) {
	Done(w, code, fmt.Sprintf(msg, a...))
}

func BadReq(w http.ResponseWriter, msg string) {
	Done(w, http.StatusBadRequest, msg)
}
func BadReqf(w http.ResponseWriter, msg string, a ...any) {
	Donef(w, http.StatusBadRequest, msg, a...)
}
func ServerErr(w http.ResponseWriter, msg string) {
	Done(w, http.StatusInternalServerError, msg)
}

func NotFound(w http.ResponseWriter) {
	Done(w, http.StatusNotFound, "not found")
}

func Unauthorized(w http.ResponseWriter) {
	Done(w, http.StatusUnauthorized, "unauthorized")
}

func Close(r io.ReadCloser, w http.ResponseWriter, code int, msg string) {
	Done(w, code, msg)
}

func Closef(r io.ReadCloser, w http.ResponseWriter, code int, msg string, a ...any) {
	Donef(w, code, msg, a...)
	if err := r.Close(); err != nil {
		logger.Debug().Err(err).Msg("failed to close response")
	}
}

func WriteJSONObj(w http.ResponseWriter, obj any) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	err := json.NewEncoder(w).Encode(obj)

	if err != nil {
		logger.Debug().Err(err).Msg("error while writing json object response")
	}
}

func WriteJSONArr[T any](w http.ResponseWriter, arr []T) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	var err error

	if arr == nil {
		_, err = w.Write([]byte("[]"))
	} else {
		err = json.NewEncoder(w).Encode(arr)
	}

	if err != nil {
		logger.Debug().Err(err).Msg("error while writing json array response")
	}
}
