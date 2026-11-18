package database

import (
	"errors"
	"fmt"
)

var (
	ErrInvalidDatabaseVersion = errors.New("database version is invalid")
)

// FoodLogRowError reports that one food row of an event log could not be
// saved. Index is the row's position in the slice that was passed in; Err is
// the cause (for example ErrFoodPortionIsZero), reachable with errors.Is.
type FoodLogRowError struct {
	Index int
	Err   error
}

// Error implements error.
func (e *FoodLogRowError) Error() string {
	return fmt.Sprintf("food row %d: %v", e.Index, e.Err)
}

// Unwrap returns the cause, so errors.Is sees through the row error.
func (e *FoodLogRowError) Unwrap() error {
	return e.Err
}
