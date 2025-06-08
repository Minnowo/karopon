package connection

import (
	"context"
	"karopon/src/database"
	"karopon/src/database/postgres"
)

func Connect(ctx context.Context, db database.Vendor, connection string) (database.DB, error) {

	switch db {

	case database.POSTGRES:

		con, err := postgres.OpenPGDatabase(ctx, connection)

		return con, err
	}

	panic("Database type is not supported!")
}
