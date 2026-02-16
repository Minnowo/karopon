package postgres

import (
	"context"
	"fmt"
	"karopon/src/database"
	"time"

	"github.com/rs/zerolog/log"
)

func (db *PGDatabase) LoadUserSession(ctx context.Context, token []byte, session *database.TblUserSession) error {

	if len(token) != 32 {
		return fmt.Errorf("Token must be 32 length")
	}

	query := `
		SELECT * FROM PON.USER_SESSION s
		WHERE s.TOKEN = $1
	`

	return db.GetContext(ctx, session, query, token)
}

func (db *PGDatabase) LoadUserSessions(ctx context.Context, userId int, session *[]database.TblUserSession) error {

	query := `
		SELECT * FROM PON.USER_SESSION s
		WHERE s.USER_ID = $1
	`

	return db.SelectContext(ctx, session, query, userId)
}

func (db *PGDatabase) AddUserSession(ctx context.Context, session *database.TblUserSession) error {

	query := `
		INSERT INTO PON.USER_SESSION (
			USER_ID, EXPIRES, TOKEN
		) VALUES (
			:user_id, :expires, :token
		)
	`
	_, err := db.NamedExecContext(ctx, query, session)

	return err
}

func (db *PGDatabase) DeleteUserSessionByToken(ctx context.Context, token []byte) error {

	query := `
		DELETE FROM PON.USER_SESSION
		WHERE TOKEN = $1
	`

	_, err := db.ExecContext(ctx, query, token)

	return err
}

func (db *PGDatabase) DeleteUserSessionsExpireAfter(ctx context.Context, time time.Time) error {

	query := `
		DELETE FROM PON.USER_SESSION
		WHERE EXPIRES <= $1
	`

	result, err := db.ExecContext(ctx, query, time.UTC())

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	log.Debug().Err(err).Int64("amount", rows).Msg("deleted user expired sessions")

	return nil
}
