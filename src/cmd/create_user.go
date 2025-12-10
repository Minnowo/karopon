package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/connection"

	"github.com/pkg/errors"
	"github.com/urfave/cli/v3"
	"golang.org/x/crypto/bcrypt"
)

func CmdCreateUser(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database-conn").(string)
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

	if err := conn.LoadUser(ctx, username, &user); err != nil {

		if err == sql.ErrNoRows {
			// continue
		} else {
			return errors.Wrap(err, "error checking if user exists")
		}
	} else {
		return fmt.Errorf("user already exists")
	}

	pass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return err
	}

	user.Name = username
	user.Password = pass
	user.DarkMode = true
	user.ShowDiabetes = true
	user.CaloricCalcMethod = "auto"
	user.EventHistoryFetchLimit = 50
	user.InsulinSensitivityFactor = 3
	user.TargetBloodSugar = 5.6

	if _, err := conn.AddUser(ctx, &user); err != nil {
		return err
	}
	return nil
}
