package cmd

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/connection"

	"github.com/urfave/cli/v3"
	"golang.org/x/crypto/bcrypt"
)

var errUserAlreadyExists = errors.New("user already exists")

func CmdCreateUser(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database-conn").(string)
	vendorStr := c.Value("database-vendor").(string)
	username := c.Value("username").(string)
	password := c.Value("password").(string)

	conn, err := connection.ConnectStr(context.Background(), vendorStr, dbconn)

	if err != nil {
		return err
	}

	if err := conn.Migrate(ctx); err != nil {
		return err
	}

	var user database.TblUser

	if err := conn.LoadUser(ctx, username, &user); err != nil {

		if errors.Is(err, sql.ErrNoRows) {
			// continue
		} else {
			return fmt.Errorf("%w: error checking if user exists", err)
		}
	} else {
		return errUserAlreadyExists
	}

	pass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return err
	}

	user.Name = username
	user.Password = pass
	user.Theme = "auto"
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
