package database

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type TimeMillis time.Time

func (t TimeMillis) Time() time.Time {
	return time.Time(t).UTC()
}

func (t TimeMillis) MarshalJSON() ([]byte, error) {
	if t.Time().IsZero() {
		return []byte{'0'}, nil
	}
	ms := time.Time(t).UTC().UnixMilli()
	return fmt.Appendf(nil, "%d", ms), nil
}

func (t *TimeMillis) UnmarshalJSON(b []byte) error {
	var ms int64
	if err := json.Unmarshal(b, &ms); err != nil {
		return err
	}
	if ms == 0 {
		*t = TimeMillis(time.Time{}.UTC())
	} else {
		*t = TimeMillis(time.Unix(0, ms*int64(time.Millisecond)).UTC())
	}
	return nil
}

func (t TimeMillis) Value() (driver.Value, error) {
	return time.Time(t), nil
}

func (t *TimeMillis) Scan(value any) error {
	switch v := value.(type) {
	case time.Time:
		*t = TimeMillis(v)
		return nil
	default:
		return fmt.Errorf("cannot scan %T into UnixMillis", value)
	}
}
