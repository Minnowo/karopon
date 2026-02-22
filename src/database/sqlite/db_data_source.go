package sqlite

import (
	"context"
	"karopon/src/database"
)

func (db *SqliteDatabase) AddDataSource(ctx context.Context, ds *database.TblDataSource) (int, error) {

	query := `
		INSERT INTO PON_DATA_SOURCE(
			NAME, URL, NOTES
		) VALUES (
			:NAME, :URL, :NOTES
		)
    `

	return db.NamedInsertGetLastRowID(ctx, query, ds)
}

func (db *SqliteDatabase) LoadDataSourceByName(ctx context.Context, name string, ds *database.TblDataSource) error {

	query := `SELECT * FROM PON_DATA_SOURCE WHERE NAME = $1 LIMIT 1`

	return db.GetContext(ctx, ds, query, name)
}

func (db *SqliteDatabase) LoadDataSources(ctx context.Context, ds *[]database.TblDataSource) error {

	query := `SELECT * FROM PON_DATA_SOURCE`

	return db.SelectContext(ctx, ds, query)
}
