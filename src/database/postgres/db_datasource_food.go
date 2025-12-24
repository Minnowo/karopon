package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddDatasourceFood(ctx context.Context, ds *database.TblDataSourceFood) (int, error) {

	query := `
		INSERT INTO PON.DATA_SOURCE_FOOD(
			DATA_SOURCE_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT, DATA_SOURCE_ROW_INT_ID
		) VALUES (
			:data_source_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat, :data_source_row_int_id
		)
        RETURNING ID;
    `

	return db.InsertOneNamedGetID(ctx, query, ds)
}
