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

// EnsureUser seeds username/password, but only into a brand new database
// (one with no users at all yet) - it is a no-op once any user exists, even
// if that user later renames themselves away from username. This is
// deliberately not "does this username exist": gating on the username would
// recreate a default user every time the account is renamed. Used by the
// Android JNI bridge to seed a default login on first launch, where there's
// no CLI available to run `db create-user`.
func EnsureUser(ctx context.Context, db database.DB, username, password string) error {

	hasAnyUser, err := db.HasAnyUser(ctx)

	if err != nil {
		return fmt.Errorf("%w: error checking if any user exists", err)
	}

	if hasAnyUser {
		return nil
	}

	pass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return err
	}

	user := database.NewDefaultTblUser(username, pass)

	_, err = db.AddUser(ctx, &user)

	return err
}

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

	var existing database.TblUser

	if err := conn.LoadUser(ctx, username, &existing); err != nil {

		if !errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: error checking if user exists", err)
		}
	} else {
		return errUserAlreadyExists
	}

	pass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return err
	}

	user := database.NewDefaultTblUser(username, pass)

	if _, err := conn.AddUser(ctx, &user); err != nil {
		return err
	}

	return nil
}
