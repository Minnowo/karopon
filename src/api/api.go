package api

import (
	"github.com/gorilla/mux"
)

type API interface {
	Register(r *mux.Router)
	Init()
	Deinit()
}
