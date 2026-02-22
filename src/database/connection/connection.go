package connection

import (
	"context"
	"errors"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/postgres"
	"karopon/src/database/sqlite"
)

var (
	ErrUnsupportedDatabase = errors.New("unsupported database vendor")
)

func ConnectStr(ctx context.Context, vendorStr string, connection string) (database.DB, error) {

	vendor := database.DBTypeFromStr(vendorStr)

	db, err := Connect(ctx, vendor, connection)

	if errors.Is(err, ErrUnsupportedDatabase) {
		return nil, fmt.Errorf("%w: %s. Expected one of %s", err, vendorStr, database.DBVendorList())
	}

	return db, err
}

func Connect(ctx context.Context, db database.Vendor, connection string) (database.DB, error) {

	switch db {

	case database.DB_VENDOR_POSTGRES:

		con, err := postgres.OpenPGDatabase(ctx, connection)

		return con, err

	case database.DB_VENDOR_SQLITE:

		con, err := sqlite.OpenSqliteDatabase(ctx, connection)

		return con, err

	case database.DB_VENDOR_UNKNOWN:

		return nil, ErrUnsupportedDatabase

	default:
		panic("Database type is not supported!")
	}
}
