package cmd

import (
	"context"
	"fmt"
	"karopon/src/api/middleware"
	v1 "karopon/src/api/v1"
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/database/connection"
	"karopon/src/handlers/user"
	"karopon/src/logging"
	"karopon/src/ui"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

func CmdServerMain(ctx context.Context, c *cli.Command) error {

	logging.Init()

	bindAddr := c.Value("bind").(string)
	port := c.Value("port").(int32)
	dbconn := c.Value("database_conn").(string)

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

	db, err := connection.Connect(context.Background(), database.POSTGRES, dbconn)

	if err != nil {
		return err
	}

	err = db.Migrate(context.Background())

	if err != nil {
		return err
	}

	userReg := user.NewRegistry()
	if err := userReg.LoadFromDatabase(db); err != nil {
		return err
	}

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
