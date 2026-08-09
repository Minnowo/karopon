import {useEffect, useMemo, useRef} from 'preact/hooks';
import {ReminderWithActivities} from '../api/types';
import {useTimeNow} from './useTimeNow';

// Due-checking doesn't need second-level precision, so this re-renders far less often
// than the shared 1s tick.
const CHECK_INTERVAL_MS = 10_000;

// Determines which (if any) reminder is currently due, reading the current time from
// the shared ticker (useTimeNow) instead of running its own interval.
// The server does not run a live countdown; due-ness is computed client-side from
// last_activity_at + interval.
export const useReminderNotifications = (reminders: ReminderWithActivities[]) => {
    const anyEnabled = reminders.some((r) => r.reminder.enabled);

    // Only subscribes to the shared ticker while at least one reminder is enabled;
    // the ticker itself stops entirely once nothing needs it.
    const timeNow = useTimeNow(anyEnabled, CHECK_INTERVAL_MS);

    // Tracks the last_activity_at we've already fired a notification for, per reminder ID,
    // so a still-due reminder doesn't re-notify every tick.
    const firedForRef = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        if (!anyEnabled) {
            return;
        }
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        } catch {
            // ignore - Notification API unavailable or blocked
        }
    }, [anyEnabled]);

    return useMemo(() => {
        let dueReminder: ReminderWithActivities | null = null;

        for (const r of reminders) {
            if (!r.reminder.enabled) {
                continue;
            }

            const dueAt = r.reminder.last_activity_at + r.reminder.interval_minutes * 60000;

            if (timeNow < dueAt) {
                continue;
            }

            if (dueReminder === null) {
                dueReminder = r;
            }

            if (firedForRef.current.get(r.reminder.id) === r.reminder.last_activity_at) {
                continue;
            }

            firedForRef.current.set(r.reminder.id, r.reminder.last_activity_at);

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const body =
                    r.activities.length > 0
                        ? r.activities[Math.floor(Math.random() * r.activities.length)].activity.name
                        : 'Time to move';

                new Notification('Movement reminder', {body});
            }
        }

        return {dueReminder};
    }, [reminders, timeNow]);
};
