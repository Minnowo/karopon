package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/minnowo/log4zero"
	"github.com/stretchr/testify/require"
)

// The log4zero registry is process-global, so every case lives in this one
// test.
func TestDumpLogConfig(t *testing.T) {

	path := filepath.Join(t.TempDir(), "log.config.json")
	content := `{"loggers": {"api-responses": {"level": "warn", "color": "auto"}, "main": {"level": "debug"}}}`
	require.NoError(t, os.WriteFile(path, []byte(content), 0o600))

	// Capture stdout: nothing but the dump may be printed, or
	// `--dump-log-config > log.config.json` writes a broken file.
	realStdout := os.Stdout
	r, wr, err := os.Pipe()
	require.NoError(t, err)
	os.Stdout = wr

	var out bytes.Buffer
	dumpErr := DumpLogConfig(&out, path)

	os.Stdout = realStdout
	require.NoError(t, wr.Close())
	stray, err := io.ReadAll(r)
	require.NoError(t, err)

	require.NoError(t, dumpErr)
	require.Empty(t, string(stray), "dump printed extra output to stdout")

	var cfg log4zero.Config
	require.NoError(t, json.Unmarshal(out.Bytes(), &cfg))

	// Every logger in the codebase is listed, including "main".
	names := []string{"main", "api-responses", "auth-middleware", "user-registry", "database-migrations"}
	for _, name := range names {
		_, ok := cfg.Loggers[name]
		require.True(t, ok, "logger %q missing from dump:\n%s", name, out.String())
	}

	// Settings from the file are reflected.
	require.Equal(t, "warn", cfg.Loggers["api-responses"].Level)
	require.Equal(t, log4zero.ColorAuto, cfg.Loggers["api-responses"].Color)
	require.Equal(t, "debug", cfg.Loggers["main"].Level)

	// The dump is a valid config file for the server to load.
	dumped := filepath.Join(t.TempDir(), "dumped.json")
	require.NoError(t, os.WriteFile(dumped, out.Bytes(), 0o600))
	require.NoError(t, log4zero.Init(dumped))
}
