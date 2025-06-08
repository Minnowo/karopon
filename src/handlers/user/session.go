package user

import (
	"karopon/src/database"
	"time"
)

type Session struct {
	user    *database.TblUser
	expires time.Time
}

func (s *Session) Expired() bool {
	return s.expires.Before(time.Now())
}
