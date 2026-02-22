package postgres

import (
	"context"
	"karopon/src/database"
	"strings"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) AddDataSourceFood(ctx context.Context, ds *database.TblDataSourceFood) (int, error) {

	query := `
		INSERT INTO PON.DATA_SOURCE_FOOD(
			DATA_SOURCE_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT, DATA_SOURCE_ROW_INT_ID
		) VALUES (
			:data_source_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat, :data_source_row_int_id
		)
        RETURNING ID;
    `

	return db.NamedInsertReturningID(ctx, query, ds)
}

func (db *PGDatabase) LoadDataSourceFoodBySimilarName(ctx context.Context, dataSourceID int, nameQuery string, out *[]database.TblDataSourceFood) error {
	return db.LoadDataSourceFoodBySimilarNameN(ctx, dataSourceID, nameQuery, 50, out)
}

func (db *PGDatabase) LoadDataSourceFoodBySimilarNameN(ctx context.Context, dataSourceID int, nameQuery string, n int, out *[]database.TblDataSourceFood) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// TODO: make this a setting or a parameter?
		// Default is 0.3, which is decent, but you get 0 results searching for apples and simple stuff when the name is long.
		tx.Exec("SET LOCAL pg_trgm.similarity_threshold = 0.1")

		query := `
			SELECT * FROM PON.DATA_SOURCE_FOOD
			WHERE DATA_SOURCE_ID = $1 AND lower(NAME) % $2
			ORDER BY similarity(lower(NAME), $2) DESC
			LIMIT $3;
		`

		return tx.Select(out, query, dataSourceID, strings.ToLower(nameQuery), n)

	})
}
