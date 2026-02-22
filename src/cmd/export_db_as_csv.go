package cmd

import (
	"context"
	"fmt"
	"io"
	"karopon/src/database"
	"karopon/src/database/connection"
	"os"
	"path"

	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

func CmdExportCsv(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database-conn").(string)
	vendorStr := c.Value("database-vendor").(string)
	outputFolder := c.Value("output-folder").(string)

	vendor := database.DBTypeFromStr(vendorStr)

	if vendor == database.UNKNOWN {
		return fmt.Errorf("Vendor %s is unsupported, use either 'sqlite' or 'postgres'", vendorStr)
	}

	conn, err := connection.Connect(context.Background(), vendor, dbconn)

	if err != nil {
		return err
	}

	ctx = context.Background()

	if err := conn.Migrate(ctx); err != nil {
		return err
	}

	if outputFolder != "" {

		log.Info().Str("path", outputFolder).Msg("Creating output folder")

		if err := os.MkdirAll(outputFolder, os.ModeDir); err != nil {
			return err
		}
	}

	type DbCsvExportFunc func(context.Context, io.Writer) error

	tables := map[string]DbCsvExportFunc{
		"user.csv":          conn.ExportUserCSV,
		"user_event.csv":    conn.ExportUserEventsCSV,
		"user_eventlog.csv": conn.ExportUserEventLogsCSV,
		"user_food.csv":     conn.ExportUserFoodsCSV,
		"user_foodlog.csv":  conn.ExportUserFoodLogsCSV,
		"user_bodylog.csv":  conn.ExportBodyLogCSV,
		"db_version.csv":    conn.ExportDbVersionCSV,
	}

	for csvFile, exportFunc := range tables {

		csvPath := path.Join(outputFolder, csvFile)

		log.Info().Str("file", csvPath).Msg("Exporting table to file")

		err := func() error {
			file, err := os.Create(csvPath)

			if err != nil {
				return err
			}
			defer file.Close()

			if err := exportFunc(ctx, file); err != nil {
				return err
			}

			return nil
		}()

		if err != nil {
			return err
		}
	}

	return nil
}
