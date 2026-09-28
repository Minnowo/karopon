import {useState} from 'preact/hooks';
import {ActivityWithTag, ReminderActivityMode, ReminderAlarmMode, ReminderWithActivities} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {AddReminderPanel} from './add_reminder_panel';
import {FormatDuration} from '../../utils/time';
import {DAY_NAMES, MinutesToTimeInputValue, ParseCronSchedule} from './schedule_window';

type ReminderEditPanelProps = {
    activities: ActivityWithTag[];
    hour12: boolean;
    reminderWithActivities: ReminderWithActivities;
    updateReminder: (
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
    ) => void;
    deleteReminder: (reminderWithActivities: ReminderWithActivities) => void;
};

const FormatScheduleSummary = (cron: string): string => {
    const windows = ParseCronSchedule(cron);

    if (windows.length === 0) {
        return 'No active windows - this reminder will never fire';
    }

    return windows
        .slice()
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
        .map((w) => `${DAY_NAMES[w.dayOfWeek]} ${MinutesToTimeInputValue(w.startMinute)}-${MinutesToTimeInputValue(w.endMinute)}`)
        .join(', ');
};

export function ReminderEditPanel({
    activities,
    hour12,
    reminderWithActivities,
    updateReminder,
    deleteReminder,
}: ReminderEditPanelProps) {
    const [showEdit, setShowEdit] = useState(false);
    // Computed once on page load, not ticked, per the "no need for this to tick" requirement.
    const [now] = useState(() => Date.now());
    const {reminder, activities: linkedActivities} = reminderWithActivities;

    if (showEdit) {
        const initialActivityIDs = linkedActivities.map((a) => a.activity.id);

        return (
            <AddReminderPanel
                activities={activities}
                hour12={hour12}
                title="Edit Reminder"
                submitLabel="Save"
                initial={{
                    enabled: reminder.enabled,
                    intervalMinutes: reminder.interval_minutes,
                    activityIDs: initialActivityIDs,
                    cron: reminder.cron,
                    activityMode: reminder.activity_mode,
                    sound: reminder.sound,
                    name: reminder.name,
                    alarmMode: reminder.alarm_mode,
                }}
                onCreate={({enabled, intervalMinutes, activityIDs, cron, activityMode, sound, name, alarmMode}) => {
                    const sortedInitial = [...initialActivityIDs].sort();
                    const sortedNew = [...activityIDs].sort();
                    const activityIDsChanged = JSON.stringify(sortedInitial) !== JSON.stringify(sortedNew);

                    updateReminder(
                        reminder.id,
                        enabled,
                        intervalMinutes,
                        cron,
                        activityIDs,
                        activityIDsChanged,
                        activityMode,
                        sound,
                        name,
                        alarmMode
                    );
                    setShowEdit(false);
                }}
                onCancel={() => setShowEdit(false)}
            />
        );
    }

    const dueAt = reminder.last_activity_at + reminder.interval_minutes * 60000;
    const msUntilDue = dueAt - now;

    return (
        <div className="w-full surface-1 flex items-center gap-2">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h2 className="mb-0">{reminder.name ? reminder.name : `Every ${reminder.interval_minutes} min`}</h2>
                    <span className={reminder.enabled ? 'text-c-success text-sm' : 'text-c-error text-sm'}>
                        {reminder.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                {reminder.name && <div className="text-sm text-c-on-surface-variant">Every {reminder.interval_minutes} min</div>}
                {reminder.enabled && (
                    <div className="text-sm text-c-on-surface-variant">
                        {msUntilDue <= 0 ? 'Due now' : `Next in ${FormatDuration(msUntilDue)}`}
                    </div>
                )}
                <div className="text-sm text-c-on-surface-variant">{FormatScheduleSummary(reminder.cron)}</div>
                <div className="text-sm text-c-on-surface-variant">
                    {linkedActivities.length === 0
                        ? 'Plain reminder, no activities'
                        : linkedActivities.map((a) => a.activity.name).join(', ')}
                </div>
            </div>
            <DropdownButton
                actions={[
                    {label: 'Edit', onClick: () => setShowEdit(true)},
                    {label: 'Delete', dangerous: true, onClick: () => deleteReminder(reminderWithActivities)},
                ]}
            />
        </div>
    );
}
