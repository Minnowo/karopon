package cmd

import (
	"context"
	"fmt"
	"karopon/src/api/middleware"
	"karopon/src/api/userreg"
	v1 "karopon/src/api/v1"
	"karopon/src/config"
	"karopon/src/constants"
	"karopon/src/database/connection"
	"karopon/src/ui"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/minnowo/log4zero"
	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

func CmdServerMain(ctx context.Context, c *cli.Command) error {

	logConfigFile := c.Value("log-config-path").(string)
	bindAddr := c.Value("bind").(string)
	port := c.Value("port").(int32)
	dbconn := c.Value("database-conn").(string)
	vendorStr := c.Value("database-vendor").(string)

	err := log4zero.InitOnce(logConfigFile)

	log.Logger = *log4zero.Get("main")
	log.Info().Err(err).Str("path", logConfigFile).Msg("logging initialized")

	if fakeAuth, ok := c.Value("fake-auth-as-user").(string); ok {
		config.SetFakeAuthUser(fakeAuth)
	}

	var addr = fmt.Sprintf("%s:%d", bindAddr, port)

	r := mux.NewRouter()
	r.Use(middleware.Recoverer)

	srv := &http.Server{
		Handler: r,
		Addr:    addr,
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout:   15 * time.Second,
		ReadTimeout:    15 * time.Second,
		MaxHeaderBytes: 2 * constants.KB,
	}

	db, err := connection.ConnectStr(context.Background(), vendorStr, dbconn)

	if err != nil {
		return err
	}

	err = db.Migrate(context.Background())

	if err != nil {
		return err
	}

	userReg := userreg.NewRegistry(db)
	userReg.ClearExpiredSessions()

	apiv1 := v1.APIV1{
		Db:      db,
		UserReg: userReg,
	}
	apiv1.Init()
	apiv1.Register(r)

	// must happen last
	ui.Register(r)

	log.Info().Str("address", addr).Msg("Site is running")

	err = srv.ListenAndServe()

	apiv1.Deinit()

	return err
}
