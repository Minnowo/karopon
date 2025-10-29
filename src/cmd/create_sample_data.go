package cmd

import (
	"context"
	"karopon/src/database"
	"karopon/src/database/connection"

	"github.com/urfave/cli/v3"
)

func CmdCreateSampleData(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database-conn").(string)
	username := c.Value("username").(string)

	if username == "" {
		username = "TEST_USER"
	}

	conn, err := connection.Connect(context.Background(), database.POSTGRES, dbconn)

	if err != nil {
		return err
	}

	ctx = context.Background()

	if err := conn.Migrate(ctx); err != nil {
		return err
	}

	if err := database.CreateSampleData(ctx, conn, username); err != nil {
		return err
	}
	return nil
}
