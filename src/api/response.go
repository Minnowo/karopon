package api

import (
	"fmt"
	"io"
	"net/http"
)

func Done(w http.ResponseWriter, code int, msg string) {
	http.Error(w, msg, code)
}

func Donef(w http.ResponseWriter, code int, msg string, a ...any) {
	Done(w, code, fmt.Sprintf(msg, a...))
}

func BadReq(w http.ResponseWriter, msg string) {
	Done(w, http.StatusBadRequest, msg)
}
func ServerErr(w http.ResponseWriter, msg string) {
	Done(w, http.StatusInternalServerError, msg)
}

func NotFound(w http.ResponseWriter) {
	Done(w, http.StatusNotFound, "404 not found")
}

func Unauthorized(w http.ResponseWriter) {
	Done(w, http.StatusUnauthorized, "401 unauthorized")
}

func Close(r io.ReadCloser, w http.ResponseWriter, code int, msg string) {
	Done(w, code, msg)
}

func Closef(r io.ReadCloser, w http.ResponseWriter, code int, msg string, a ...any) {
	Donef(w, code, msg, a...)
	r.Close()
}
