package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) GetVersion(ctx context.Context) (database.Version, error) {

	var config database.TblConfig

	query := `SELECT version FROM PON_CONFIG LIMIT 1`

	err := db.GetContext(ctx, &config, query)

	if err != nil {

		if err == sql.ErrNoRows {
			return database.VERSION_UNKNOWN, nil
		}

		return database.VERSION_NONE, err
	}

	return config.Version, nil
}

func (db *SqliteDatabase) SetVersionTx(tx *sqlx.Tx, version database.Version) error {

	_, err := tx.Exec("UPDATE PON_CONFIG SET VERSION = $1", int(version))

	if err != nil {
		return fmt.Errorf("could not update database version: %s", err)
	}

	return nil
}

func (db *SqliteDatabase) SetVersion(ctx context.Context, version database.Version) error {

	_, err := db.ExecContext(ctx, "UPDATE PON_CONFIG SET VERSION = $1", int(version))

	if err != nil {
		return fmt.Errorf("could not update database version: %s", err)
	}

	return nil
}

func (db *SqliteDatabase) ExportDbVersionCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_CONFIG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
