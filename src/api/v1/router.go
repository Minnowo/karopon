package v1

import (
	"karopon/src/api/auth"
	"karopon/src/api/middleware"
	"karopon/src/constants"
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

	user := &database.TblUser{
		Name: "minno",
		ID:   1,
	}

	api := r.PathPrefix("/api").Subrouter()
	api.Use(middleware.Cors)
	api.Use(auth.FakeAuth(user, a.UserReg))
	api.Use(auth.ParseAuth(constants.SESSION_COOKIE, a.UserReg))
	api.Use(auth.RequireAuth())

	get := api.Methods("GET").Subrouter()
	get.HandleFunc("/logout", a.api_logout)
	get.HandleFunc("/whoami", a.whoami)
	get.HandleFunc("/foods", a.get_userfood)
	get.HandleFunc("/foodlog", a.get_userfoodlog)
	get.HandleFunc("/events", a.get_userevents)
	get.HandleFunc("/events/{id}", a.get_userevent)

	post := api.Methods("POST").Subrouter()
	post.HandleFunc("/login", a.api_login)
	post.HandleFunc("/logfood", a.create_userfoodlog)
	post.HandleFunc("/logevent", a.create_userevent)
	post.HandleFunc("/food/update", a.update_userfood)

}
