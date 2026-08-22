import {useCallback, useMemo, useRef} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {ApiNewUserTimespan, ApiUpdateUserReminder, ApiUpdateUserTimespan} from '../../api/api';
import {ActivityWithTag, TaggedTimespan, TblUserReminder} from '../../api/types';
import {useReminderNotifications} from './hooks';
import {useTimeNow} from '../../hooks/useTimeNow';
import {GetErrorHandler} from '../../utils/error';
import {FormatDuration} from '../../utils/time';
import {TagToString} from '../../utils/tags';
import {PlayReminderSound} from '../../utils/sound';
import {TagChip} from '../../components/tag_chip';

const SNOOZE_MINUTES = 5;

type ShowSession = {
    reminderID: number;
    since: number;
    // Which activities to display, decided once when this reminder first becomes
    // due (either all of them, or one picked at random) - not recomputed on every
    // render, so starting/stopping a timer (which updates the reminder) doesn't
    // cause a different activity to be randomly re-picked mid-session.
    activityIDs: number[];
};

const ParseActiveTimers = (raw: string): Record<number, number> => {
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw) as Record<string, number>;
        const out: Record<number, number> = {};

        for (const [key, timespanID] of Object.entries(parsed)) {
            const activityID = Number(key);
            if (Number.isInteger(activityID) && Number.isInteger(timespanID)) {
                out[activityID] = timespanID;
            }
        }

        return out;
    } catch {
        return {};
    }
};

// Sum the completed timespans for this activity's tag since the reminder's current
// cycle started
const computeActivityTime = (
    activityWithTag: ActivityWithTag,
    timespans: TaggedTimespan[],
    since: number,
    runningTimespanID: number | undefined
): {completedMs: number; runningStartTime: number | null} => {
    const tagStr = TagToString(activityWithTag.tag);
    let completedMs = 0;
    let runningStartTime: number | null = null;

    for (const ts of timespans) {
        if (ts.timespan.start_time < since) {
            continue;
        }
        if (!ts.tags.some((t) => TagToString(t) === tagStr)) {
            continue;
        }

        if (ts.timespan.stop_time === 0) {
            if (ts.timespan.id === runningTimespanID) {
                runningStartTime = ts.timespan.start_time;
            }
            continue;
        }

        completedMs += ts.timespan.stop_time - ts.timespan.start_time;
    }

    return {completedMs, runningStartTime};
};

// Isolated so the once-a-second tick only re-renders this small span, and only while
// this activity's timer is actually running.
const ActivityTotalDuration = ({completedMs, runningStartTime}: {completedMs: number; runningStartTime: number | null}) => {
    const now = useTimeNow(runningStartTime !== null);
    const liveMs = runningStartTime !== null ? now - runningStartTime : 0;
    return <span className="wsnw">{FormatDuration(completedMs + liveMs)}</span>;
};

export const ReminderPromptPanel = (state: BaseState) => {
    const {dueReminder} = useReminderNotifications(state.reminders);

    const sessionRef = useRef<ShowSession | null>(null);

    if (dueReminder && sessionRef.current?.reminderID !== dueReminder.reminder.id) {
        const activityIDs =
            dueReminder.reminder.activity_mode === 'all'
                ? dueReminder.activities.map((a) => a.activity.id)
                : dueReminder.activities.length > 0
                  ? [dueReminder.activities[Math.floor(Math.random() * dueReminder.activities.length)].activity.id]
                  : [];

        sessionRef.current = {reminderID: dueReminder.reminder.id, since: Date.now(), activityIDs};

        PlayReminderSound(dueReminder.reminder.sound);

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const body =
                dueReminder.activities.length === 0
                    ? 'hello'
                    : dueReminder.reminder.activity_mode === 'all'
                      ? dueReminder.activities.map((a) => a.activity.name).join(', ')
                      : dueReminder.activities[Math.floor(Math.random() * dueReminder.activities.length)].activity.name;

            try {
                new Notification(dueReminder.reminder.name, {body});
            } catch {}
        }
    } else if (!dueReminder) {
        sessionRef.current = null;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleErr = useCallback(GetErrorHandler(state.setErrorMsg, state.doRefresh), [state.doRefresh]);

    const tagColorMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of state.tagColors) {
            m.set(c.namespace, c.color);
        }
        return m;
    }, [state.tagColors]);

    if (!dueReminder || !sessionRef.current) {
        return null;
    }

    const session = sessionRef.current;
    const shownActivities = dueReminder.activities.filter((a) => session.activityIDs.includes(a.activity.id));
    const activeTimers = ParseActiveTimers(dueReminder.reminder.active_timers);

    const applyReminderUpdate = (updated: TblUserReminder) => {
        ApiUpdateUserReminder(updated)
            .then(() => {
                state.setReminders(state.reminders.map((r) => (r.reminder.id === updated.id ? {...r, reminder: updated} : r)));
            })
            .catch(handleErr);
    };

    const persistActiveTimers = (timers: Record<number, number>) => {
        applyReminderUpdate({...dueReminder.reminder, active_timers: JSON.stringify(timers)});
    };

    const startActivity = (activityWithTag: ActivityWithTag) => {
        ApiNewUserTimespan({
            timespan: {id: 0, user_id: 0, created: 0, start_time: Date.now(), stop_time: 0, note: null},
            tags: [activityWithTag.tag],
        })
            .then((ts) => {
                state.setTimespans((old) => [ts, ...old]);
                persistActiveTimers({...activeTimers, [activityWithTag.activity.id]: ts.timespan.id});
            })
            .catch(handleErr);
    };

    const stopActivity = (activityWithTag: ActivityWithTag) => {
        const timespanID = activeTimers[activityWithTag.activity.id];
        const running = state.timespans.find((t) => t.timespan.id === timespanID);

        if (!running) {
            return;
        }

        const updatedTimespan = {...running.timespan, stop_time: Date.now()};

        ApiUpdateUserTimespan(updatedTimespan)
            .then(() => {
                state.setTimespans((old) =>
                    old.map((t) => (t.timespan.id === timespanID ? {...t, timespan: updatedTimespan} : t))
                );

                const rest = {...activeTimers};
                delete rest[activityWithTag.activity.id];
                persistActiveTimers(rest);
            })
            .catch(handleErr);
    };

    // Finalizes every timer still running for this reminder's activities, so nothing
    // is left dangling once the notification is dismissed via Skip/Snooze.
    const stopAllRunningTimers = (): Promise<void> => {
        const timespanIDs = Object.values(activeTimers);

        if (timespanIDs.length === 0) {
            return Promise.resolve();
        }

        const now = Date.now();

        const ops = timespanIDs.map((timespanID) => {
            const running = state.timespans.find((t) => t.timespan.id === timespanID);

            if (!running) {
                return Promise.resolve();
            }

            const updatedTimespan = {...running.timespan, stop_time: now};

            return ApiUpdateUserTimespan(updatedTimespan).then(() => {
                state.setTimespans((old) =>
                    old.map((t) => (t.timespan.id === timespanID ? {...t, timespan: updatedTimespan} : t))
                );
            });
        });

        return Promise.all(ops).then(() => undefined);
    };

    // Used by both Skip and Done - either way, any running timers are finalized and
    // the reminder's cycle resets so it fires again after another full interval.
    const dismiss = () => {
        stopAllRunningTimers()
            .then(() => {
                applyReminderUpdate({...dueReminder.reminder, last_activity_at: Date.now(), active_timers: '{}'});
            })
            .catch(handleErr);
    };

    const snooze = () => {
        stopAllRunningTimers()
            .then(() => {
                const now = Date.now();
                applyReminderUpdate({
                    ...dueReminder.reminder,
                    last_activity_at: now + SNOOZE_MINUTES * 60000 - dueReminder.reminder.interval_minutes * 60000,
                    active_timers: '{}',
                });
            })
            .catch(handleErr);
    };

    return (
        <div className="flex flex-col items-center text-center py-4 mb-4">
            <div className="container-theme max-w-sm w-full text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-lg font-bold">{dueReminder.reminder.name || 'Time to move'}</span>
                </div>

                {shownActivities.length > 0 ? (
                    <div className="mb-4 flex flex-col gap-2">
                        {shownActivities.map((activityWithTag) => {
                            const runningTimespanID = activeTimers[activityWithTag.activity.id];
                            const {completedMs, runningStartTime} = computeActivityTime(
                                activityWithTag,
                                state.timespans,
                                dueReminder.reminder.last_activity_at,
                                runningTimespanID
                            );
                            const isRunning = runningStartTime !== null;

                            return (
                                <div key={activityWithTag.activity.id} className="flex items-center justify-between gap-2">
                                    <div>
                                        <p>
                                            {activityWithTag.activity.name} - {activityWithTag.activity.duration} min
                                            {activityWithTag.activity.note ? ` - ${activityWithTag.activity.note}` : ''}
                                        </p>
                                        <TagChip
                                            tag={activityWithTag.tag}
                                            color={tagColorMap.get(activityWithTag.tag.namespace)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ActivityTotalDuration completedMs={completedMs} runningStartTime={runningStartTime} />
                                        {isRunning ? (
                                            <button className="cancel-btn" onClick={() => stopActivity(activityWithTag)}>
                                                Stop
                                            </button>
                                        ) : (
                                            <button className="save-btn" onClick={() => startActivity(activityWithTag)}>
                                                Start
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="mb-4">Take a few minutes to stand up, stretch, or walk around.</p>
                )}

                <div className="flex justify-between flex-wrap">
                    <div className="flex justify-end gap-2 flex-wrap">
                        <button className="cancel-btn" onClick={dismiss}>
                            Skip
                        </button>
                        <button className="cancel-btn" onClick={snooze}>
                            Snooze {SNOOZE_MINUTES}m
                        </button>
                    </div>
                    <button className="save-btn" onClick={dismiss}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
