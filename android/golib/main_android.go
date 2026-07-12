// Package main is the JNI entry point that lets the Android app start and
// stop the Karopon Go server from Kotlin. It is built with
// `go build -buildmode=c-shared` for each Android ABI (see
// android/scripts/build-go-lib.sh) and loaded via System.loadLibrary in
// cc.headpats.karopon.GoServer.
//
// The exported function names follow the JNI naming convention
// (Java_<package>_<class>_<method>) so the JVM can resolve them automatically
// without an explicit JNI_OnLoad/RegisterNatives call.
package main

/*
#include <jni.h>
#include <stdlib.h>

static const char *karopon_get_string_utf_chars(JNIEnv *env, jstring str) {
	return (*env)->GetStringUTFChars(env, str, NULL);
}

static void karopon_release_string_utf_chars(JNIEnv *env, jstring str, const char *chars) {
	(*env)->ReleaseStringUTFChars(env, str, chars);
}
*/
import "C"

import (
	"context"
	"karopon/src/cmd"
	"path/filepath"
	"sync"
	"time"

	"github.com/minnowo/log4zero"
	"github.com/rs/zerolog/log"
)

const (
	statusOK             = C.jint(0)
	statusAlreadyRunning = C.jint(1)
	statusStartFailed    = C.jint(2)
)

var (
	mu       sync.Mutex
	shutdown func(context.Context) error
)

func jstringToString(env *C.JNIEnv, s C.jstring) string {

	if s == 0 {
		return ""
	}

	chars := C.karopon_get_string_utf_chars(env, s)
	defer C.karopon_release_string_utf_chars(env, s, chars)

	return C.GoString(chars)
}

//export Java_cc_headpats_karopon_GoServer_nativeStart
func Java_cc_headpats_karopon_GoServer_nativeStart(
	env *C.JNIEnv,
	clazz C.jclass,
	jDataDir C.jstring,
	jPort C.jint,
	jSessionSecret C.jstring,
) C.jint {

	mu.Lock()
	defer mu.Unlock()

	if shutdown != nil {
		return statusAlreadyRunning
	}

	dataDir := jstringToString(env, jDataDir)
	sessionSecret := jstringToString(env, jSessionSecret)

	// There's no log.config.json on the device for log4zero.InitOnce to
	// read, and its color:true fallback is unreadable in logcat (raw ANSI
	// escapes), so configure it directly instead. Every log4zero.Get(name)
	// call in the codebase must be listed here - anything missing keeps the
	// color:true default.
	logCfg := log4zero.Config{
		Loggers: map[string]log4zero.LoggerConfig{
			"main":                {Level: "info"},
			"api-responses":       {Level: "info"},
			"auth-middleware":     {Level: "info"},
			"user-registry":       {Level: "info"},
			"database-migrations": {Level: "info"},
		},
	}

	logConfigErr := log4zero.InitWith(logCfg, log4zero.GetNew)
	log.Logger = *log4zero.Get("main")
	log.Info().Err(logConfigErr).Msg("logging initialized")

	opts := cmd.ServerOptions{
		BindAddr:       "127.0.0.1",
		Port:           int32(jPort),
		DatabaseVendor: "sqlite",
		DatabaseConn:   filepath.Join(dataDir, "karopon.db"),
		SessionSecret:  sessionSecret,
		// Only seeded into a brand new (empty) database - see EnsureUser.
		// Change the password from the app's Settings page after logging in.
		DefaultUsername: "admin",
		DefaultPassword: "admin",
	}

	fn, err := cmd.StartServer(context.Background(), opts)

	if err != nil {
		log.Error().Err(err).Msg("failed to start server")
		return statusStartFailed
	}

	shutdown = fn

	return statusOK
}

//export Java_cc_headpats_karopon_GoServer_nativeStop
func Java_cc_headpats_karopon_GoServer_nativeStop(env *C.JNIEnv, clazz C.jclass) {

	mu.Lock()
	defer mu.Unlock()

	if shutdown == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("error shutting down server")
	}

	shutdown = nil
}

//export Java_cc_headpats_karopon_GoServer_nativeIsRunning
func Java_cc_headpats_karopon_GoServer_nativeIsRunning(env *C.JNIEnv, clazz C.jclass) C.jboolean {

	mu.Lock()
	defer mu.Unlock()

	if shutdown == nil {
		return C.jboolean(0)
	}

	return C.jboolean(1)
}

func main() {}
