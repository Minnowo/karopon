package main

import (
	"context"
	"karopon/src/cmd"
	"os"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

func main() {

	err := godotenv.Load()

	if err != nil {
		log.Fatal().Err(err).Msg("Error loading .env file")
		return
	}

	cmd := &cli.Command{
		Name:  "Karopon",
		Usage: "",
		Commands: []*cli.Command{
			{
				Name:        "db",
				Description: "Run stuff on the database",
				Commands: []*cli.Command{
					{
						Name:        "create-sample-data",
						Description: "Create the sample data",
						Action:      cmd.CmdCreateSampleData,
						Flags: []cli.Flag{
							&cli.StringFlag{
								Name:     "database_conn",
								Aliases:  []string{"c"},
								Usage:    "The database connection string",
								Sources:  cli.EnvVars("DATABASE_CONN"),
								Required: false,
							},
							&cli.StringFlag{
								Name:     "username",
								Aliases:  []string{"u"},
								Usage:    "The username",
								Required: false,
							},
						},
					},
					{
						Name:        "create-user",
						Description: "Creates a user",
						Action:      cmd.CmdCreateUser,
						Flags: []cli.Flag{
							&cli.StringFlag{
								Name:     "database_conn",
								Aliases:  []string{"c"},
								Usage:    "The database connection string",
								Sources:  cli.EnvVars("DATABASE_CONN"),
								Required: false,
							},
							&cli.StringFlag{
								Name:     "username",
								Aliases:  []string{"u"},
								Usage:    "The username",
								Required: true,
							},
							&cli.StringFlag{
								Name:     "password",
								Aliases:  []string{"p"},
								Usage:    "The password",
								Required: true,
							},
						},
					},
				},
			},
			{
				Name:        "run",
				Description: "Run the server",
				Action:      cmd.CmdServerMain,
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "database_conn",
						Aliases:  []string{"c"},
						Usage:    "The database connection string",
						Sources:  cli.EnvVars("DATABASE_CONN"),
						Required: false,
					},
					&cli.StringFlag{
						Name:     "bind",
						Aliases:  []string{"b"},
						Usage:    "The bind address",
						Value:    "0.0.0.0",
						Sources:  cli.EnvVars("BIND_ADDR"),
						Required: false,
					},
					&cli.Int32Flag{
						Name:     "port",
						Aliases:  []string{"p"},
						Usage:    "The port number",
						Value:    9070,
						Sources:  cli.EnvVars("PORT"),
						Required: false,
					},
					&cli.StringFlag{
						Name:     "registry",
						Aliases:  []string{"r"},
						Usage:    "The user registry file",
						Value:    "./users.json",
						Sources:  cli.EnvVars("USER_REGISTRY_PATH"),
						Required: false,
					},
				},
			},
		},
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatal().Err(err).Msg("")
	}

}
