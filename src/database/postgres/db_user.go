package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddUser(ctx context.Context, user *database.TblUser) (int, error) {

	query := `
        INSERT INTO PON.USER (NAME, PASSWORD)
        VALUES (:name, :password)
        RETURNING ID;
    `

	id, err := db.InsertOneNamedGetID(ctx, query, user)

	return id, err
}

func (db *PGDatabase) LoadUser(ctx context.Context, username string, user *database.TblUser) error {

	query := `SELECT ID, NAME, PASSWORD, CREATED FROM PON.USER WHERE NAME = $1 LIMIT 1`

	err := db.GetContext(ctx, user, query, username)

	if err != nil {
		return err
	}

	return nil
}

func (db *PGDatabase) LoadUsers(ctx context.Context, users *[]database.TblUser) error {
	query := `
	SELECT * FROM PON.USER fl
	`

	return db.SelectContext(ctx, users, query)
}
