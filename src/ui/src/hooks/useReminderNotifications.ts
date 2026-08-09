import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {ReminderWithActivities} from '../api/types';

// useReminderNotifications ticks once a second while any reminder is enabled and
// determines which (if any) reminder is currently due. The server does not run a
// live countdown; due-ness is computed client-side from last_activity_at + interval.
export const useReminderNotifications = (reminders: ReminderWithActivities[]) => {
    const [timeNow, setTimeNow] = useState<number>(Date.now());

    // Tracks the last_activity_at we've already fired a notification for, per reminder ID,
    // so a still-due reminder doesn't re-notify every tick.
    const firedForRef = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        if (!reminders.some((r) => r.reminder.enabled)) {
            return;
        }
        try {
            if (typeof Notification !== 'undefined') {
                if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }
        } catch {}

        const ticker = setInterval(() => setTimeNow(Date.now()), 30_000);

        return () => clearInterval(ticker);
    }, [reminders]);

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
