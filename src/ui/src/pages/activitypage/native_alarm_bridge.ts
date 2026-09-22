import {useEffect} from 'preact/hooks';
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
    useEffect(() => {
        const bridge = window.AndroidAlarms;

        if (!bridge) {
            return;
        }

        const now = Date.now();

        for (const {reminder} of reminders) {
            if (!reminder.enabled) {
                bridge.cancel(reminder.id);
                continue;
            }

            const dueAt = reminder.last_activity_at + reminder.interval_minutes * 60000;
            const windows = ParseCronSchedule(reminder.cron);
            const nextFireAt = ComputeNextFireTime(dueAt, windows, now);

            if (nextFireAt === null) {
                bridge.cancel(reminder.id);
                continue;
            }

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
