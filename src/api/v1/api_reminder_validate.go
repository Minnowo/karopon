package v1

import (
	"encoding/json"
	"fmt"
	"karopon/src/database"
	"strconv"
	"strings"
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
		return "", fmt.Errorf("active_timers cannot track more than %d activities at once", maxActiveTimers)
	}

	normalized := make(map[int]int, len(parsed))

	for k, timespanID := range parsed {

		activityID, err := strconv.Atoi(k)

		if err != nil || activityID <= 0 {
			return "", fmt.Errorf("active_timers key %q is not a valid activity ID", k)
		}

		if timespanID <= 0 {
			return "", fmt.Errorf("active_timers value for activity %d must be a positive timespan ID", activityID)
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
		return fmt.Errorf("name must be at most %d characters", maxReminderNameLength)
	}

	switch r.ActivityMode {
	case "":
		r.ActivityMode = "random"
	case "random", "all":
	default:
		return fmt.Errorf("activity_mode must be one of 'random' or 'all', got %q", r.ActivityMode)
	}

	switch r.AlarmMode {
	case "":
		r.AlarmMode = "reminder"
	case "reminder", "alarm":
	default:
		return fmt.Errorf("alarm_mode must be one of 'reminder' or 'alarm', got %q", r.AlarmMode)
	}

	if len(r.Sound) > maxSoundLength {
		return fmt.Errorf("sound must be at most %d characters", maxSoundLength)
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
