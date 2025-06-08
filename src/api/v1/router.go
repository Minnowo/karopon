package v1

import (
	"karopon/src/api/middleware"
	"karopon/src/database"
	"karopon/src/handlers/user"

	"github.com/rs/zerolog/log"

	"github.com/gorilla/mux"
)

type APIV1 struct {
	Db      database.DB
	UserReg *user.UserRegistry
	router  *mux.Router
}

func (a *APIV1) Init() {

	if a.UserReg == nil {
		log.Panic().Msg("user registry is nil")
	}
}

func (a *APIV1) Deinit() {
}

func (a *APIV1) Register(r *mux.Router) {
	a.router = r

	api := r.PathPrefix("/api").Subrouter()
	api.Use(middleware.FakeAuth(a.UserReg))
	// api.Use(middleware.Auth(a.UserReg))

	get := api.Methods("GET").Subrouter()
	get.HandleFunc("/whoami", a.whoami)
	get.HandleFunc("/foodlog", a.get_userfoodlog)
	get.HandleFunc("/events", a.get_userevents)
	get.HandleFunc("/events/{:id}", a.get_userevents)
	get.HandleFunc("/logout", a.api_logout)

	post := api.Methods("POST").Subrouter()
	post.HandleFunc("/login", a.api_login)
	post.HandleFunc("/logfood", a.create_userfoodlog)
}
