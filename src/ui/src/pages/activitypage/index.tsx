import {useCallback, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {
    ApiNewUserActivity,
    ApiUpdateUserActivity,
    ApiDeleteUserActivity,
    ApiNewUserReminder,
    ApiUpdateUserReminder,
    ApiUpdateUserReminderActivities,
    ApiDeleteUserReminder,
} from '../../api/api';
import {
    ActivityWithTag,
    NewUserActivityRequest,
    ReminderActivityMode,
    ReminderAlarmMode,
    ReminderWithActivities,
    UpdateUserActivityRequest,
    UserTimeFormat,
} from '../../api/types';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {GetErrorHandler, RefreshOnUnauthorized} from '../../utils/error';
import {AddActivityPanel} from './add_activity_panel';
import {ActivityEditPanel} from './activity_edit_panel';
import {AddReminderPanel} from './add_reminder_panel';
import {ReminderEditPanel} from './reminder_edit_panel';

export const ActivityPage = (state: BaseState) => {
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [showAddActivityPanel, setShowAddActivityPanel] = useState<boolean>(false);
    const [showAddReminderPanel, setShowAddReminderPanel] = useState<boolean>(false);

    const hour12 = state.user.time_format === UserTimeFormat.Hour12;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleErr = useCallback(GetErrorHandler(setErrorMsg, state.doRefresh), [state.doRefresh]);

    // addActivity and updateActivity reject with the API error so the form can show it.
    const addActivity = (req: NewUserActivityRequest): Promise<void> => {
        return ApiNewUserActivity(req)
            .then((activity) => {
                const activityWithTag: ActivityWithTag = {
                    activity,
                    tag: {namespace: req.tag_namespace, name: req.tag_name},
                };
                const activities = [...state.activities, activityWithTag];
                activities.sort((a, b) => a.activity.name.localeCompare(b.activity.name));
                state.setActivities(activities);
                setShowAddActivityPanel(false);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const updateActivity = (req: UpdateUserActivityRequest): Promise<void> => {
        return ApiUpdateUserActivity(req)
            .then(() => {
                const activities = state.activities.map((a) =>
                    a.activity.id === req.id
                        ? {
                              activity: {id: req.id, name: req.name, duration: req.duration, note: req.note},
                              tag: {namespace: req.tag_namespace, name: req.tag_name},
                          }
                        : a
                );
                activities.sort((a, b) => a.activity.name.localeCompare(b.activity.name));
                state.setActivities(activities);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const deleteActivity = (activityWithTag: ActivityWithTag) => {
        if (!confirm(`Delete activity "${activityWithTag.activity.name}"?`)) {
            return;
        }
        ApiDeleteUserActivity(activityWithTag.activity)
            .then(() => {
                state.setActivities(state.activities.filter((a) => a.activity.id !== activityWithTag.activity.id));
                state.setReminders(
                    state.reminders.map((r) => ({
                        ...r,
                        activities: r.activities.filter((a) => a.activity.id !== activityWithTag.activity.id),
                    }))
                );
            })
            .catch(handleErr);
    };

    const addReminder = (
        enabled: boolean,
        intervalMinutes: number,
        cron: string,
        activityIDs: number[],
        activityMode: ReminderActivityMode,
        sound: string,
        name: string,
        alarmMode: ReminderAlarmMode
    ): Promise<void> => {
        return ApiNewUserReminder({
            reminder: {
                id: 0,
                enabled,
                interval_minutes: intervalMinutes,
                last_activity_at: new Date().getTime(),
                cron,
                activity_mode: activityMode,
                active_timers: '{}',
                sound,
                name,
                alarm_mode: alarmMode,
            },
            activity_ids: activityIDs,
        })
            .then((reminder) => {
                const linkedActivities = state.activities.filter((a) => activityIDs.includes(a.activity.id));
                const reminders = [...state.reminders, {reminder, activities: linkedActivities}];
                state.setReminders(reminders);
                setShowAddReminderPanel(false);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const updateReminder = (
        reminderID: number,
        enabled: boolean,
        intervalMinutes: number,
        cron: string,
        activityIDs: number[],
        activityIDsChanged: boolean,
        activityMode: ReminderActivityMode,
        sound: string,
        name: string,
        alarmMode: ReminderAlarmMode
    ): Promise<void> => {
        const existing = state.reminders.find((r) => r.reminder.id === reminderID);

        if (!existing) {
            return Promise.reject(new Error('This reminder could not be found. Reload the page and try again.'));
        }

        const updatedReminder = {
            ...existing.reminder,
            enabled,
            interval_minutes: intervalMinutes,
            cron,
            activity_mode: activityMode,
            sound,
            name,
            alarm_mode: alarmMode,
        };

        // The reminder is saved first and shown at once; its activities follow, so a failure of the
        // second request never leaves the list showing the old reminder.
        const setInList = (activities: ActivityWithTag[]) =>
            state.setReminders((old) =>
                old.map((r) => (r.reminder.id === reminderID ? {reminder: updatedReminder, activities} : r))
            );

        return ApiUpdateUserReminder(updatedReminder)
            .then(() => {
                setInList(existing.activities);
                if (!activityIDsChanged) {
                    return;
                }
                return ApiUpdateUserReminderActivities({reminder_id: reminderID, activity_ids: activityIDs}).then(() =>
                    setInList(state.activities.filter((a) => activityIDs.includes(a.activity.id)))
                );
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const deleteReminder = (reminderWithActivities: ReminderWithActivities) => {
        if (!confirm('Delete this reminder?')) {
            return;
        }
        ApiDeleteUserReminder(reminderWithActivities.reminder)
            .then(() => {
                state.setReminders(state.reminders.filter((r) => r.reminder.id !== reminderWithActivities.reminder.id));
            })
            .catch(handleErr);
    };

    return (
        <>
            <div className="flex justify-evenly my-4">
                <button onClick={() => setShowAddReminderPanel(true)}>New Reminder</button>
                <button onClick={() => setShowAddActivityPanel(true)}>New Activity</button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showAddReminderPanel && (
                <AddReminderPanel
                    activities={state.activities}
                    hour12={hour12}
                    onCreate={({enabled, intervalMinutes, cron, activityIDs, activityMode, sound, name, alarmMode}) =>
                        addReminder(enabled, intervalMinutes, cron, activityIDs, activityMode, sound, name, alarmMode)
                    }
                    onCancel={() => setShowAddReminderPanel(false)}
                />
            )}

            {showAddActivityPanel && (
                <AddActivityPanel
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    tagColors={undefined}
                    onCreate={addActivity}
                    onCancel={() => setShowAddActivityPanel(false)}
                />
            )}

            <div className="mb-8">
                <h1>Reminders</h1>

                <div className="flex flex-col gap-2">
                    {state.reminders.length === 0 ? (
                        <p>No reminders have been created yet.</p>
                    ) : (
                        state.reminders.map((r) => (
                            <ReminderEditPanel
                                key={r.reminder.id}
                                activities={state.activities}
                                hour12={hour12}
                                reminderWithActivities={r}
                                updateReminder={updateReminder}
                                deleteReminder={deleteReminder}
                            />
                        ))
                    )}
                </div>
            </div>

            <div>
                <h1>Break Activities</h1>

                <div className="flex flex-col gap-2">
                    {state.activities.length === 0 ? (
                        <p>No break activities have been created yet.</p>
                    ) : (
                        state.activities.map((a) => (
                            <ActivityEditPanel
                                key={a.activity.id}
                                namespaces={state.namespaces}
                                setNamespaces={state.setNamespaces}
                                activityWithTag={a}
                                updateActivity={updateActivity}
                                deleteActivity={deleteActivity}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
