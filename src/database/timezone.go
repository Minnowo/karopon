package database

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type Timezone struct {
	Name string
	loc  *time.Location
}

func NewTimezone(name string) (Timezone, error) {
	loc, err := time.LoadLocation(name)
	if err != nil {
		return Timezone{}, fmt.Errorf("invalid timezone: %w", err)
	}

	return Timezone{
		Name: name,
		loc:  loc,
	}, nil
}

func (t Timezone) Loc() *time.Location {
	if t.loc == nil {
		return time.UTC
	}
	return t.loc
}

func (t Timezone) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.Name)
}

func (t *Timezone) UnmarshalJSON(data []byte) error {

	var name string

	if err := json.Unmarshal(data, &name); err != nil {
		return err
	}

	if loc, err := time.LoadLocation(name); err == nil {
		t.Name = name
		t.loc = loc
	}

	return nil
}

func (t *Timezone) Value() (driver.Value, error) {
	return t.Name, nil
}

func (t *Timezone) Scan(value any) error {
	switch v := value.(type) {
	case string:

		if zone, err := NewTimezone(v); err != nil {
			// always return a valid timezone
			t.Name = "UTC"
			t.loc = time.UTC
		} else {
			t.Name = zone.Name
			t.loc = zone.loc
		}

		return nil

	default:
		return fmt.Errorf("cannot scan %T into Timezone", value)
	}
}
