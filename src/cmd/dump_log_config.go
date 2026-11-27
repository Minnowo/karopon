package cmd

import (
	"errors"
	"fmt"
	"io"
	"io/fs"

	"github.com/minnowo/log4zero"
)

// DumpLogConfig loads the logger config at configPath and writes every
// registered logger, with its current settings, to w as a log4zero config
// file. A missing config file is not an error: the defaults are written, so
// the output can seed a new file. Any other load error is returned.
func DumpLogConfig(w io.Writer, configPath string) error {

	err := log4zero.InitOnce(configPath)

	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("could not load log config %s: %w", configPath, err)
	}

	// "main" is only fetched inside CmdServerMain, so register it here to
	// have it listed. The other loggers are package-level and already exist.
	log4zero.Get("main")

	return log4zero.WriteConfig(w)
}
