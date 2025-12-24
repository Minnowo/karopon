package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddDatasource(ctx context.Context, ds *database.TblDataSource) (int, error) {

	query := `
		INSERT INTO PON.DATA_SOURCE(
			NAME, URL, NOTES
		) VALUES (
			:name, :url, :notes
		)
        RETURNING ID;
    `

	return db.InsertOneNamedGetID(ctx, query, ds)
}

func (db *PGDatabase) LoadDatasourceByName(ctx context.Context, name string, ds *database.TblDataSource) error {

	query := `SELECT * FROM PON.DATA_SOURCE WHERE NAME = $1 LIMIT 1`

	return db.GetContext(ctx, ds, query, name)
}

func (db *PGDatabase) LoadDatasources(ctx context.Context, ds *[]database.TblDataSource) error {

	query := `SELECT * FROM PON.DATA_SOURCE`

	return db.SelectContext(ctx, ds, query)
}
