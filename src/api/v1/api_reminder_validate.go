package v1

import (
	"encoding/json"
	"errors"
	"fmt"
	"karopon/src/database"
	"strconv"
	"strings"
)

var (
	ErrReminderTooManyTimers       = errors.New("active_timers tracks too many activities")
	ErrReminderTimerActivityID     = errors.New("active_timers key is not a valid activity ID")
	ErrReminderTimerTimespanID     = errors.New("active_timers value must be a positive timespan ID")
	ErrReminderNameTooLong         = errors.New("reminder name is too long")
	ErrReminderInvalidActivityMode = errors.New("activity_mode must be one of 'random' or 'all'")
	ErrReminderInvalidAlarmMode    = errors.New("alarm_mode must be one of 'reminder' or 'alarm'")
	ErrReminderSoundTooLong        = errors.New("reminder sound name is too long")
)

// maxActiveTimers caps how many concurrent activity timers a single reminder can
// track, to keep the stored blob small and bounded.
const maxActiveTimers = 64

// normalizeActiveTimers validates that raw is a JSON object mapping activity IDs to
// running timespan IDs (both positive integers), and returns it re-serialized into a
// canonical form. This is stored as an opaque blob, so it must be validated on the
// way in - a client-controlled JSON value should not be trusted or stored as-is.
func normalizeActiveTimers(raw string) (string, error) {

	if raw == "" {
		return "{}", nil
	}

	var parsed map[string]int

	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return "", fmt.Errorf("active_timers must be a JSON object of activity ID to timespan ID: %w", err)
	}

	if len(parsed) > maxActiveTimers {
		return "", fmt.Errorf("%w: at most %d", ErrReminderTooManyTimers, maxActiveTimers)
	}

	normalized := make(map[int]int, len(parsed))

	for k, timespanID := range parsed {

		activityID, err := strconv.Atoi(k)

		if err != nil || activityID <= 0 {
			return "", fmt.Errorf("%w: %q", ErrReminderTimerActivityID, k)
		}

		if timespanID <= 0 {
			return "", fmt.Errorf("%w: activity %d", ErrReminderTimerTimespanID, activityID)
		}

		normalized[activityID] = timespanID
	}

	out, err := json.Marshal(normalized)

	if err != nil {
		return "", err
	}

	return string(out), nil
}

// maxSoundLength bounds the Sound field so it can't be used to smuggle arbitrary data;
// the actual set of playable sounds is defined client-side and may grow over time.
const maxSoundLength = 32

// maxReminderNameLength matches the NAME column's VARCHAR(128) limit in postgres.
const maxReminderNameLength = 128

// normalizeReminderFields validates and defaults the opaque ActivityMode/ActiveTimers/
// Sound/Name fields on r in place.
func normalizeReminderFields(r *database.TblUserReminder) error {

	r.Name = strings.TrimSpace(r.Name)

	if len(r.Name) > maxReminderNameLength {
		return fmt.Errorf("%w: at most %d characters", ErrReminderNameTooLong, maxReminderNameLength)
	}

	switch r.ActivityMode {
	case "":
		r.ActivityMode = "random"
	case "random", "all":
	default:
		return fmt.Errorf("%w, got %q", ErrReminderInvalidActivityMode, r.ActivityMode)
	}

	switch r.AlarmMode {
	case "":
		r.AlarmMode = "reminder"
	case "reminder", "alarm":
	default:
		return fmt.Errorf("%w, got %q", ErrReminderInvalidAlarmMode, r.AlarmMode)
	}

	if len(r.Sound) > maxSoundLength {
		return fmt.Errorf("%w: at most %d characters", ErrReminderSoundTooLong, maxSoundLength)
	}

	if r.Sound == "" {
		r.Sound = "chime"
	}

	normalized, err := normalizeActiveTimers(r.ActiveTimers)

	if err != nil {
		return err
	}

	r.ActiveTimers = normalized

	return nil
}
