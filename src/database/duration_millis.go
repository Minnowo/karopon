package database

import (
	"encoding/json"
	"fmt"
	"time"
)

// DurationMillis wraps time.Duration but marshals/unmarshals as milliseconds.
type DurationMillis time.Duration

// MarshalJSON encodes the duration as milliseconds.
func (d DurationMillis) MarshalJSON() ([]byte, error) {
	ms := time.Duration(d).Milliseconds()
	return fmt.Appendf(nil, "%d", ms), nil
}

// UnmarshalJSON decodes a duration from milliseconds.
func (d *DurationMillis) UnmarshalJSON(b []byte) error {
	var ms int64
	if err := json.Unmarshal(b, &ms); err != nil {
		return err
	}
	*d = DurationMillis(time.Duration(ms) * time.Millisecond)
	return nil
}

// Optional helper to get time.Duration
func (d DurationMillis) Duration() time.Duration {
	return time.Duration(d)
}
