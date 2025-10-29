package v1

import (
	"context"
	"karopon/src/api/auth"
	"karopon/src/api/middleware"
	"karopon/src/config"
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

func (a *APIV1) check() {
	if a.UserReg == nil {
		log.Panic().Msg("user registry is nil")
	}
	if a.Db == nil {
		log.Panic().Msg("database must not be nil")
	}
}

func (a *APIV1) Init() {
	a.check()
}

func (a *APIV1) Deinit() {
}

func (a *APIV1) Register(r *mux.Router) {

	a.check()
	a.router = r

	api := r.PathPrefix("/api").Subrouter()
	api.Use(middleware.Cors)

	if config.FakeAuth() {

		var user database.TblUser

		if err := a.Db.LoadUser(context.Background(), config.FakeAuthUser(), &user); err != nil {
			log.Panic().
				Err(err).
				Str("username", config.FakeAuthUser()).
				Msg("could not load user for fake auth")
		}

		log.Info().Str("username", user.Name).Msg("faking auth as user")

		api.Use(auth.FakeAuth(&user, a.UserReg))
	}
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
