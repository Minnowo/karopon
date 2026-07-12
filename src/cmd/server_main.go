package cmd

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"karopon/src/api/middleware"
	"karopon/src/api/userreg"
	v1 "karopon/src/api/v1"
	"karopon/src/config"
	"karopon/src/constants"
	"karopon/src/database/connection"
	"karopon/src/ui"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/minnowo/log4zero"
	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

// ServerOptions holds everything needed to start the HTTP server, decoupled
// from how the caller obtained them (CLI flags, JNI args, etc).
type ServerOptions struct {
	BindAddr       string
	Port           int32
	DatabaseVendor string
	DatabaseConn   string
	SessionSecret  string //nolint:gosec // not a hardcoded credential, it's a config value supplied by the caller
	FakeAuthUser   string

	// DefaultUsername/DefaultPassword, if both set, seed a login via
	// EnsureUser (no-op if that user already exists). Used by the Android
	// build, which has no CLI to run `db create-user` on-device.
	DefaultUsername string
	DefaultPassword string //nolint:gosec // not a hardcoded credential, it's a config value supplied by the caller
}

// StartServer connects to the database, runs migrations, and starts serving
// HTTP requests in the background. It returns once the server is bound and
// accepting connections; call the returned shutdown func to stop it.
func StartServer(ctx context.Context, opts ServerOptions) (shutdown func(context.Context) error, err error) {

	if opts.FakeAuthUser != "" {
		config.SetFakeAuthUser(opts.FakeAuthUser)
	}

	addr := fmt.Sprintf("%s:%d", opts.BindAddr, opts.Port)

	listener, err := net.Listen("tcp", addr)

	if err != nil {
		return nil, err
	}

	log.Info().Str("db", opts.DatabaseVendor).Str("conn", opts.DatabaseConn).Msg("connecting to db")
	db, err := connection.ConnectStr(ctx, opts.DatabaseVendor, opts.DatabaseConn)

	if err != nil {
		_ = listener.Close()
		return nil, err
	}

	if err = db.Migrate(ctx); err != nil {
		_ = listener.Close()
		return nil, err
	}

	if opts.DefaultUsername != "" && opts.DefaultPassword != "" {
		if err = EnsureUser(ctx, db, opts.DefaultUsername, opts.DefaultPassword); err != nil {
			_ = listener.Close()
			return nil, err
		}
	}

	sessionSecret := []byte(opts.SessionSecret)

	if len(sessionSecret) == 0 {
		log.Warn().
			Msg("no session-secret set; generating a random one — existing sessions will be invalidated on restart")
		sessionSecret = make([]byte, 32)
		_, _ = rand.Read(sessionSecret)
	}

	userReg := userreg.NewRegistry(db, sessionSecret)
	userReg.ClearExpiredSessions()

	apiv1 := v1.APIV1{
		Db:      db,
		UserReg: userReg,
	}
	apiv1.Init()

	r := mux.NewRouter()
	r.Use(middleware.Recoverer)

	apiv1.Register(r)

	// must happen last
	ui.Register(r)

	srv := &http.Server{
		Handler: r,
		Addr:    addr,
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout:   15 * time.Second,
		ReadTimeout:    15 * time.Second,
		MaxHeaderBytes: 2 * constants.KB,
	}

	go func() {
		if serveErr := srv.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			log.Error().Err(serveErr).Msg("server stopped unexpectedly")
		}
	}()

	log.Info().Str("address", addr).Time("at", time.Now()).Msg("Site is running")

	shutdown = func(shutdownCtx context.Context) error {
		apiv1.Deinit()
		return srv.Shutdown(shutdownCtx)
	}

	return shutdown, nil
}

func CmdServerMain(ctx context.Context, c *cli.Command) error {

	logConfigFile := c.Value("log-config-path").(string)

	err := log4zero.InitOnce(logConfigFile)

	log.Logger = *log4zero.Get("main")
	log.Info().Err(err).Str("path", logConfigFile).Msg("logging initialized")

	opts := ServerOptions{
		BindAddr:       c.Value("bind").(string),
		Port:           c.Value("port").(int32),
		DatabaseVendor: c.Value("database-vendor").(string),
		DatabaseConn:   c.Value("database-conn").(string),
		SessionSecret:  c.Value("session-secret").(string),
	}

	if fakeAuth, ok := c.Value("fake-auth-as-user").(string); ok {
		opts.FakeAuthUser = fakeAuth
	}

	shutdown, err := StartServer(ctx, opts)

	if err != nil {
		return err
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	return shutdown(shutdownCtx)
}
