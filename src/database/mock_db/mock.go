package mock_db

import (
	"context"
	"io"
	"karopon/src/database"
	"time"

	"github.com/vinovest/sqlx"
)

// BaseMockDB panics on every db call.
// It is intended to be used as a base for mocking, so the mocker can implement only what they care about.
type BaseMockDB struct{}

func (p *BaseMockDB) DBx() *sqlx.DB {
	panic("not implemented")
}

func (p *BaseMockDB) Base() *database.SQLxDB {
	panic("not implemented")
}

func (p *BaseMockDB) WithTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportUserCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportUserEventsCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportUserEventLogsCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportUserFoodsCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportUserFoodLogsCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportBodyLogCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) ExportVersionCSV(ctx context.Context, w io.Writer) error {
	panic("not implemented")
}

func (p *BaseMockDB) Migrate(ctx context.Context) error {
	panic("not implemented")
}

func (p *BaseMockDB) GetMigrationMaxVersion() database.Version {
	panic("not implemented")
}

func (p *BaseMockDB) GetVersion(ctx context.Context) (database.Version, error) {
	panic("not implemented")
}

func (p *BaseMockDB) SetVersion(ctx context.Context, version database.Version) error {
	panic("not implemented")
}

func (p *BaseMockDB) SetVersionTx(tx *sqlx.Tx, version database.Version) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUser(ctx context.Context, user *database.TblUser) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) UpdateUser(ctx context.Context, user *database.TblUser) error {
	panic("not implemented")
}

func (p *BaseMockDB) UsernameTaken(ctx context.Context, userID int, username string) (bool, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUser(ctx context.Context, username string, user *database.TblUser) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserByID(ctx context.Context, id int, user *database.TblUser) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserSession(ctx context.Context, token []byte, session *database.TblUserSession) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserSessions(ctx context.Context, userID int, session *[]database.TblUserSession) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserSession(ctx context.Context, session *database.TblUserSession) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserSessionByToken(ctx context.Context, token []byte) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserSessionByUserAndToken(ctx context.Context, userID int, token []byte) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserSessionsExpireAfter(ctx context.Context, t time.Time) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserFood(ctx context.Context, food *database.TblUserFood) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserFoods(ctx context.Context, food []database.TblUserFood) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserFoods(ctx context.Context, userID int, out *[]database.TblUserFood) error {
	panic("not implemented")
}

func (p *BaseMockDB) UpdateUserFood(ctx context.Context, food *database.TblUserFood) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserFood(ctx context.Context, userID int, foodID int) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserEvent(ctx context.Context, event *database.TblUserEvent) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEvent(ctx context.Context, userID int, eventID int, event *database.TblUserEvent) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEventByName(
	ctx context.Context,
	userID int,
	name string,
	event *database.TblUserEvent,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEvents(ctx context.Context, userID int, events *[]database.TblUserEvent) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadAndOrCreateUserEventByNameTx(
	tx *sqlx.Tx,
	userID int,
	name string,
	out *database.TblUserEvent,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserEventLogTx(tx *sqlx.Tx, event *database.TblUserEventLog) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserEventLogWith(
	ctx context.Context,
	event *database.TblUserEventLog,
	foodlogs []database.TblUserFoodLog,
) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEventLogs(ctx context.Context, userID int, events *[]database.TblUserEventLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEventLogsTx(tx *sqlx.Tx, userID int, events *[]database.TblUserEventLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserEventLog(ctx context.Context, userID int, eventlogID int, deleteFoodLogs bool) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEventFoodLog(
	ctx context.Context,
	userID int,
	eventlogID int,
	eflog *database.UserEventFoodLog,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEventFoodLogs(ctx context.Context, userID int, eflogs *[]database.UserEventFoodLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserEventFoodLogsN(
	ctx context.Context,
	userID int,
	n int,
	eflogs *[]database.UserEventFoodLog,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) UpdateUserEventFoodLog(ctx context.Context, eflog *database.UpdateUserEventLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserFoodLog(ctx context.Context, food *database.TblUserFoodLog) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserFoodLogTx(tx *sqlx.Tx, food *database.TblUserFoodLog) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserFoodLogs(ctx context.Context, userID int, out *[]database.TblUserFoodLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserBodyLogs(ctx context.Context, userID int, out *[]database.TblUserBodyLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserBodyLogs(ctx context.Context, log *database.TblUserBodyLog) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) UpdateUserBodyLog(ctx context.Context, log *database.TblUserBodyLog) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserBodyLog(ctx context.Context, userID int, bodyLogID int) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddDataSource(ctx context.Context, ds *database.TblDataSource) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadDataSources(ctx context.Context, ds *[]database.TblDataSource) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadDataSourceByName(ctx context.Context, name string, ds *database.TblDataSource) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddDataSourceFood(ctx context.Context, ds *database.TblDataSourceFood) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadDataSourceFoodBySimilarName(
	ctx context.Context,
	dataSourceID int,
	nameQuery string,
	out *[]database.TblDataSourceFood,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadDataSourceFoodBySimilarNameN(
	ctx context.Context,
	dataSourceID int,
	nameQuery string,
	n int,
	out *[]database.TblDataSourceFood,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserGoal(ctx context.Context, userID int, goalID int) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserGoals(ctx context.Context, userID int, out *[]database.TblUserGoal) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserGoal(ctx context.Context, userGoal *database.TblUserGoal) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserGoalProgress(
	ctx context.Context,
	curTime time.Time,
	userGoal *database.TblUserGoal,
	out *database.UserGoalProgress,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserTag(ctx context.Context, tag *database.TblUserTag) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserTags(ctx context.Context, userID int, out *[]database.TblUserTag) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserTagNamespaces(ctx context.Context, userID int, out *[]string) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserNamespaceTags(
	ctx context.Context,
	userID int,
	namespace string,
	out *[]database.TblUserTag,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserNamespaceTagsLikeN(
	ctx context.Context,
	userID int,
	namespace, tagNameLike string,
	n int,
	out *[]database.TblUserTag,
) error {
	panic("not implemented")
}

func (p *BaseMockDB) AddUserTimespan(
	ctx context.Context,
	ts *database.TblUserTimespan,
	tags []database.TblUserTag,
) (int, error) {
	panic("not implemented")
}

func (p *BaseMockDB) DeleteUserTimespan(ctx context.Context, userID int, tsID int) error {
	panic("not implemented")
}

func (p *BaseMockDB) UpdateUserTimespan(ctx context.Context, ts *database.TblUserTimespan) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserTimespans(ctx context.Context, userID int, out *[]database.TblUserTimespan) error {
	panic("not implemented")
}

func (p *BaseMockDB) LoadUserTimespansWithTags(ctx context.Context, userID int, out *[]database.TaggedTimespan) error {
	panic("not implemented")
}

func (p *BaseMockDB) SetUserTimespanTags(
	ctx context.Context,
	userID, timespanID int,
	tags []database.TblUserTag,
) error {
	panic("not implemented")
}
