import {useCallback, useMemo, useRef} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {ApiNewUserTimespan, ApiUpdateUserReminder} from '../../api/api';
import {TblUserReminder} from '../../api/types';
import {useReminderNotifications} from '../../hooks/useReminderNotifications';
import {useTimeNow} from '../../hooks/useTimeNow';
import {GetErrorHandler} from '../../utils/error';
import {FormatDuration} from '../../utils/time';
import {TagChip} from '../../components/tag_chip';

const SNOOZE_MINUTES = 5;

// Mounted once at the App level (not scoped to the Activity page) so a reminder
// can interrupt the user regardless of which page they're currently on.
export const ReminderPromptPanel = (state: BaseState) => {
    const {dueReminder} = useReminderNotifications(state.reminders);

    // Only ticks (subscribes to the shared timer) while a reminder is actually showing,
    // so it can report how long this prompt has been on screen.
    const timeNow = useTimeNow(dueReminder !== null);

    // Tracks when the *currently shown* reminder first appeared, resetting whenever a
    // different reminder takes over or the prompt goes away and comes back.
    const shownSinceRef = useRef<{reminderID: number; since: number} | null>(null);

    if (dueReminder && shownSinceRef.current?.reminderID !== dueReminder.reminder.id) {
        shownSinceRef.current = {reminderID: dueReminder.reminder.id, since: Date.now()};
    } else if (!dueReminder) {
        shownSinceRef.current = null;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleErr = useCallback(GetErrorHandler(state.setErrorMsg, state.doRefresh), [state.doRefresh]);

    const suggestedActivity = useMemo(() => {
        if (!dueReminder || dueReminder.activities.length === 0) {
            return null;
        }
        return dueReminder.activities[Math.floor(Math.random() * dueReminder.activities.length)];
    }, [dueReminder]);

    const tagColorMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of state.tagColors) {
            m.set(c.namespace, c.color);
        }
        return m;
    }, [state.tagColors]);

    if (!dueReminder || !shownSinceRef.current) {
        return null;
    }

    const shownFor = timeNow - shownSinceRef.current.since;

    const applyReminderUpdate = (updated: TblUserReminder) => {
        ApiUpdateUserReminder(updated)
            .then(() => {
                state.setReminders(state.reminders.map((r) => (r.reminder.id === updated.id ? {...r, reminder: updated} : r)));
            })
            .catch(handleErr);
    };

    const skip = () => {
        applyReminderUpdate({...dueReminder.reminder, last_activity_at: Date.now()});
    };

    const snooze = () => {
        const now = Date.now();
        applyReminderUpdate({
            ...dueReminder.reminder,
            last_activity_at: now + SNOOZE_MINUTES * 60000 - dueReminder.reminder.interval_minutes * 60000,
        });
    };

    const logTimespan = (startTime: number, stopTime: number) => {
        if (!suggestedActivity) {
            return;
        }

        ApiNewUserTimespan({
            timespan: {
                id: 0,
                user_id: 0,
                created: 0,
                start_time: startTime,
                stop_time: stopTime,
                note: null,
            },
            tags: [suggestedActivity.tag],
        })
            .then((ts) => {
                state.setTimespans([ts, ...state.timespans]);
                applyReminderUpdate({...dueReminder.reminder, last_activity_at: Date.now()});
            })
            .catch(handleErr);
    };

    // Default: logs the activity's own configured duration, ending now - by the time
    // the user hits Log, they've already done it, not about to start it.
    const log = () => {
        if (!suggestedActivity) {
            return;
        }
        const now = Date.now();
        logTimespan(now - suggestedActivity.activity.duration * 60000, now);
    };

    // Logs a timespan spanning exactly how long this prompt has actually been shown,
    // for when the user did more (or less) than the activity's default duration.
    const logShownTime = () => {
        if (!shownSinceRef.current) {
            return;
        }
        logTimespan(shownSinceRef.current.since, Date.now());
    };

    // Inline, like LoginDialog: part of the normal page flow above the routed content,
    // not an overlay, so the user can keep doing whatever they were doing below it.
    return (
        <div className="flex flex-col items-center text-center py-4 mb-4">
            <div className="container-theme max-w-sm w-full text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-lg font-bold">Time to move</span>
                    <span className="text-sm text-c-subtext wsnw">Shown for {FormatDuration(shownFor)}</span>
                </div>

                {suggestedActivity ? (
                    <div className="mb-4">
                        <p className="mb-2">
                            {suggestedActivity.activity.name} - {suggestedActivity.activity.duration} min
                            {suggestedActivity.activity.note ? ` - ${suggestedActivity.activity.note}` : ''}
                        </p>
                        <TagChip tag={suggestedActivity.tag} color={tagColorMap.get(suggestedActivity.tag.namespace)} />
                    </div>
                ) : (
                    <p className="mb-4">Take a few minutes to stand up, stretch, or walk around.</p>
                )}

                <div className="flex justify-end gap-2 flex-wrap">
                    <button className="cancel-btn" onClick={skip}>
                        Skip
                    </button>
                    <button className="cancel-btn" onClick={snooze}>
                        Snooze {SNOOZE_MINUTES}m
                    </button>
                    {suggestedActivity && (
                        <>
                            <button className="save-btn" onClick={logShownTime}>
                                Log {FormatDuration(shownFor)}
                            </button>
                            <button className="save-btn" onClick={log}>
                                Log ({suggestedActivity.activity.duration} min)
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
