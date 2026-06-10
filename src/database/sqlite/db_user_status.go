package sqlite

import (
	"context"
	"karopon/src/database"
	"time"
)

func (db *SqliteDatabase) LoadUserTimeData(
	ctx context.Context,
	userID int,
	startTime time.Time,
	endTime time.Time,
	tags []string,
	groupby database.GroupBy,
	out *[]database.TimespanTagDurationPoint,
) error {
	return nil
}
