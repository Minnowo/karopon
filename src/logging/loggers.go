package logging

import (
	"encoding/json"
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	zerologger "github.com/rs/zerolog/log"
)

type LogConfig struct {
	Level         zerolog.Level `json:"-"`
	LevelStr      string        `json:"level"`
	ShowInConsole bool          `json:"show_in_console"`
	UseColor      bool          `json:"use_color"`
	LoggerName    string        `json:"name"`
}

const (
	LOAD_LOGGERS = false
)

var (
	logConfigs map[string]LogConfig
)

func loadLogConfigs(path string) error {

	var configs []LogConfig

	fileBytes, err := os.ReadFile(path)

	if err != nil {
		return err
	}

	if err := json.Unmarshal(fileBytes, &configs); err != nil {
		return err
	}

	for _, cfg := range configs {

		if cfg.LoggerName == "" {
			continue
		}

		level, err := zerolog.ParseLevel(cfg.LevelStr)

		if err != nil {
			level = zerolog.WarnLevel
		}

		cfg.Level = level

		logConfigs[cfg.LoggerName] = cfg
	}

	return nil
}

func init() {
	loadLogConfigs("loggers.json")

	cw := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
	zerologger.Logger = zerologger.Output(cw).Level(zerolog.DebugLevel)
}

func Init() {}

func GetLogger(name string) zerolog.Logger {

	if !LOAD_LOGGERS {
		return zerologger.Logger
	} else {

		cfg, ok := logConfigs[name]

		if !ok {
			return zerolog.Nop()
		}

		var writers []io.Writer

		writers = append(writers, zerologger.Logger)

		var writer zerolog.LevelWriter

		if cfg.ShowInConsole {
			csl := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339, NoColor: !cfg.UseColor}
			writer = zerolog.MultiLevelWriter(zerologger.Logger, csl)
		} else {
			writer = zerolog.MultiLevelWriter(zerologger.Logger)
		}

		log := zerolog.New(writer).Level(cfg.Level)

		return log
	}
}
