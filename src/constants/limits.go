package constants

const (
	_  = iota // ignore first value by assigning to blank identifier
	KB = 1 << (10 * iota)
	MB
	GB
	TB
	PB
	EB
	ZB
	YB
)

const MAX_LOGIN_FORM_SIZE int64 = 2 * KB

const MAX_USERNAME_LENGTH int = 20
const MAX_USER_PASSWORD_LENGTH int = 72

const MAX_PASSWORD_LENGTH int = 72 // bcrypt max allowed
const MIN_PASSWORD_LENGTH int = 1

// MIN_SESSION_EXPIRE_SECONDS is the shortest session length a user can set: an hour.
const MIN_SESSION_EXPIRE_SECONDS int64 = 60 * 60

// MAX_SESSION_EXPIRE_SECONDS is the longest session length, 10 years. It keeps
// the expiry time far from overflowing a time.Duration; 0 or a huge value used
// to make every login create an already expired session.
const MAX_SESSION_EXPIRE_SECONDS int64 = 10 * 365 * 24 * 60 * 60

// MAX_BLOOD_SUGAR_SETTING caps the target blood sugar and the insulin
// sensitivity factor; both must also be more
// than 0, since the insulin calculation divides by the factor. The cap covers
// both mmol/L and mg/dL.
const MAX_BLOOD_SUGAR_SETTING float64 = 1000

// MAX_EVENT_LOG_TRAILING_ROWS is the most empty food rows the event form adds.
const MAX_EVENT_LOG_TRAILING_ROWS int = 20

// MAX_HISTORY_FETCH_LIMIT is the most events or timers fetched at start; load
// more fetches the rest.
const MAX_HISTORY_FETCH_LIMIT int = 1000

// MAX_DAY_TIME_OFFSET_SECONDS is the latest a day can start after midnight:
// less than a whole day. The offset is never negative.
const MAX_DAY_TIME_OFFSET_SECONDS int = 24*60*60 - 1

const MAX_CUSTOM_CSS_SIZE int = 128 * KB
const MAX_MISC_SETTINGS_SIZE int = 128 * KB

const SHOW_DOWNLOAD_EXPIRE_TIME bool = true
const SHOW_DOWNLOAD_EXPIRE_TIME_REMAINING bool = true
const SHOW_DOWNLOADS_REMAINING bool = true

const EXPIREY_TIME_FORMAT string = "2006-01-02 15:04:05 MST"

const HOST string = "localhost"
