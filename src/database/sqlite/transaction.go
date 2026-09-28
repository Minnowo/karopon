package sqlite

import (
	"context"

	"github.com/vinovest/sqlx"
)

// WithTxRead is a plain transaction. SQLite keeps one snapshot from a transaction's first read,
// and the two sqlite drivers handle sql.TxOptions differently, so none are passed.
func (db *SqliteDatabase) WithTxRead(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	return db.WithTx(ctx, fn)
}
