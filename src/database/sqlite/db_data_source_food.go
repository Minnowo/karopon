package sqlite

import (
	"context"
	"karopon/src/database"
	"strings"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddDataSourceFood(ctx context.Context, ds *database.TblDataSourceFood) (int, error) {

	query := `
		INSERT INTO PON_DATA_SOURCE_FOOD(
			DATA_SOURCE_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT, DATA_SOURCE_ROW_INT_ID
		) VALUES (
			:DATA_SOURCE_ID, :NAME, :UNIT, :PORTION, :PROTEIN, :CARB, :FIBRE, :FAT, :DATA_SOURCE_ROW_INT_ID
		)
    `

	return db.NamedInsertReturningID(ctx, query, ds)
}

func (db *SqliteDatabase) LoadDataSourceFoodBySimilarName(ctx context.Context, dataSourceID int, nameQuery string, out *[]database.TblDataSourceFood) error {
	return db.LoadDataSourceFoodBySimilarNameN(ctx, dataSourceID, nameQuery, 50, out)
}

func (db *SqliteDatabase) LoadDataSourceFoodBySimilarNameN(ctx context.Context, dataSourceID int, nameQuery string, n int, out *[]database.TblDataSourceFood) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
		   SELECT * FROM PON_DATA_SOURCE_FOOD
			WHERE DATA_SOURCE_ID = $1 
			  AND LOWER(NAME) LIKE '%' || LOWER($2) || '%'
			ORDER BY LENGTH(NAME) - LENGTH(REPLACE(LOWER(NAME), LOWER($2), '')) DESC
			LIMIT $3;
		`

		return tx.Select(out, query, dataSourceID, strings.ToLower(nameQuery), n)

	})
}
