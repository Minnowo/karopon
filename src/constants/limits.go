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

const SHOW_DOWNLOAD_EXPIRE_TIME bool = true
const SHOW_DOWNLOAD_EXPIRE_TIME_REMAINING bool = true
const SHOW_DOWNLOADS_REMAINING bool = true

const EXPIREY_TIME_FORMAT string = "2006-01-02 15:04:05 MST"

const HOST string = "localhost"
