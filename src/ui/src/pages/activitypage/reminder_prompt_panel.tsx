import {useCallback, useMemo} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {ApiNewUserTimespan, ApiUpdateUserReminder} from '../../api/api';
import {TblUserReminder} from '../../api/types';
import {useReminderNotifications} from '../../hooks/useReminderNotifications';
import {GetErrorHandler} from '../../utils/error';
import {TagChip} from '../../components/tag_chip';

const SNOOZE_MINUTES = 5;

// Mounted once at the App level (not scoped to the Activity page) so a reminder
// can interrupt the user regardless of which page they're currently on.
export const ReminderPromptPanel = (state: BaseState) => {
    const {dueReminder} = useReminderNotifications(state.reminders);

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

    if (!dueReminder) {
        return null;
    }

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

    const log = () => {
        if (!suggestedActivity) {
            return;
        }

        const now = Date.now();

        ApiNewUserTimespan({
            timespan: {
                id: 0,
                user_id: 0,
                created: 0,
                start_time: now,
                stop_time: now + suggestedActivity.activity.duration * 60000,
                note: null,
            },
            tags: [suggestedActivity.tag],
        })
            .then((ts) => {
                state.setTimespans([ts, ...state.timespans]);
                applyReminderUpdate({...dueReminder.reminder, last_activity_at: now});
            })
            .catch(handleErr);
    };

    // Inline, like LoginDialog: part of the normal page flow above the routed content,
    // not an overlay, so the user can keep doing whatever they were doing below it.
    return (
        <div className="flex flex-col items-center text-center py-4 mb-4">
            <div className="container-theme max-w-sm w-full text-left">
                <div className="text-lg font-bold mb-2">Time to move</div>

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
                        <button className="save-btn" onClick={log}>
                            Log
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
