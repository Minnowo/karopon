package v1

import (
	"context"
	"karopon/src/api/auth"
	"karopon/src/api/middleware"
	"karopon/src/config"
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
	api.Use(auth.ParseAuth(a.UserReg))

	api.HandleFunc("/login", a.api_login).Methods("POST")
	api.HandleFunc("/logout", a.getLogout)

	get := api.Methods("GET", "OPTIONS").Subrouter()
	get.Use(auth.RequireAuth())
	get.HandleFunc("/whoami", a.getUser)
	get.HandleFunc("/user", a.getUser)
	get.HandleFunc("/foods", a.getUserFoods)
	get.HandleFunc("/events", a.getUserEvents)
	get.HandleFunc("/events/{id}", a.getUserEvent)
	get.HandleFunc("/eventlogs", a.getUserEventLogs)
	get.HandleFunc("/eventfoodlogs", a.getUserEventFoodLogs)
	get.HandleFunc("/bodylog", a.getUserBodyLogs)
	get.HandleFunc("/time", a.getServerTime)
	get.HandleFunc("/datasources", a.getDataSources)
	get.HandleFunc("/datasources/{id}/{query}", a.getDataSourceFood)

	post := api.Methods("POST", "OPTIONS").Subrouter()
	post.Use(auth.RequireAuth())
	post.HandleFunc("/user/update", a.updateUser)
	post.HandleFunc("/food/new", a.addUserFood)
	post.HandleFunc("/food/update", a.updateUserFood)
	post.HandleFunc("/food/delete", a.deleteUserFood)
	post.HandleFunc("/eventlog/new", a.createUserEvent)
	post.HandleFunc("/eventlog/delete", a.deleteUserEventLog)
	post.HandleFunc("/eventfoodlog/update", a.updateUserEventFoodLog)
	post.HandleFunc("/bodylog/new", a.createUserBodyLog)

}
