import {useEffect, useRef} from 'preact/hooks';
import {ReminderWithActivities} from '../../api/types';
import {ComputeNextFireTime, ParseCronSchedule} from './schedule_window';

type AndroidAlarmsBridge = {
    schedule(id: number, whenMillis: number, title: string, body: string, isAlarm: boolean, sound: string): void;
    cancel(id: number): void;
};

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- global augmentation requires interface
    interface Window {
        AndroidAlarms?: AndroidAlarmsBridge;
    }
}

export const useSyncNativeAlarms = (reminders: ReminderWithActivities[]) => {

    const scheduledRef = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        const bridge = window.AndroidAlarms;

        if (!bridge) {
            return;
        }

        const now = Date.now();
        const scheduled = scheduledRef.current;

        for (const {reminder} of reminders) {
            if (!reminder.enabled) {
                if (scheduled.delete(reminder.id)) {
                    bridge.cancel(reminder.id);
                }
                continue;
            }

            const dueAt = reminder.last_activity_at + reminder.interval_minutes * 60000;
            const windows = ParseCronSchedule(reminder.cron);
            const nextFireAt = ComputeNextFireTime(dueAt, windows, now);

            if (nextFireAt === null) {
                if (scheduled.delete(reminder.id)) {
                    bridge.cancel(reminder.id);
                }
                continue;
            }

            if (scheduled.get(reminder.id) === nextFireAt) {
                continue;
            }

            scheduled.set(reminder.id, nextFireAt);
            bridge.schedule(
                reminder.id,
                nextFireAt,
                reminder.name,
                reminder.name,
                reminder.alarm_mode === 'alarm',
                reminder.sound
            );
        }
    }, [reminders]);
};
