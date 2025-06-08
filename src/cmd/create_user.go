package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/connection"

	"github.com/urfave/cli/v3"
	"golang.org/x/crypto/bcrypt"
)

func CmdCreateUser(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database_conn").(string)
	username := c.Value("username").(string)
	password := c.Value("password").(string)

	conn, err := connection.Connect(context.Background(), database.POSTGRES, dbconn)

	if err != nil {
		return err
	}

	ctx = context.Background()

	if err := conn.Migrate(ctx); err != nil {
		return err
	}

	var user database.TblUser
	user.Name = username

	if usr, err := conn.GetUser(ctx, username); usr != nil || err != nil {

		if err == sql.ErrNoRows {
			// continue
		} else if err != nil {
			return err
		} else {
			return fmt.Errorf("user already exists")
		}
	}

	pass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return err
	}

	user.Password = pass

	if _, err := conn.CreateUser(ctx, &user); err != nil {
		return err
	}
	return nil
}
