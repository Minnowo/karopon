package postgres

import (
	"context"
	"database/sql"

	"github.com/vinovest/sqlx"
)

// WithTxRead uses REPEATABLE READ, since the default READ COMMITTED takes a new snapshot for each query.
func (db *PGDatabase) WithTxRead(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	return db.WithTxOpts(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true}, fn)
}
