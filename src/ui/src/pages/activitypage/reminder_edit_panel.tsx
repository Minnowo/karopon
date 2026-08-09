import {useState} from 'preact/hooks';
import {ActivityWithTag, ReminderWithActivities} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {AddReminderPanel} from './add_reminder_panel';
import {FormatDuration} from '../../utils/time';

type ReminderEditPanelProps = {
    activities: ActivityWithTag[];
    reminderWithActivities: ReminderWithActivities;
    updateReminder: (
        reminderID: number,
        enabled: boolean,
        intervalMinutes: number,
        activityIDs: number[],
        activityIDsChanged: boolean
    ) => void;
    deleteReminder: (reminderWithActivities: ReminderWithActivities) => void;
};

export function ReminderEditPanel({activities, reminderWithActivities, updateReminder, deleteReminder}: ReminderEditPanelProps) {
    const [showEdit, setShowEdit] = useState(false);
    // Computed once on page load, not ticked, per the "no need for this to tick" requirement.
    const [now] = useState(() => Date.now());
    const {reminder, activities: linkedActivities} = reminderWithActivities;

    if (showEdit) {
        const initialActivityIDs = linkedActivities.map((a) => a.activity.id);

        return (
            <AddReminderPanel
                activities={activities}
                title="Edit Reminder"
                submitLabel="Save"
                initial={{
                    enabled: reminder.enabled,
                    intervalMinutes: reminder.interval_minutes,
                    activityIDs: initialActivityIDs,
                }}
                onCreate={({enabled, intervalMinutes, activityIDs}) => {
                    const sortedInitial = [...initialActivityIDs].sort();
                    const sortedNew = [...activityIDs].sort();
                    const activityIDsChanged = JSON.stringify(sortedInitial) !== JSON.stringify(sortedNew);

                    updateReminder(reminder.id, enabled, intervalMinutes, activityIDs, activityIDsChanged);
                    setShowEdit(false);
                }}
                onCancel={() => setShowEdit(false)}
            />
        );
    }

    const dueAt = reminder.last_activity_at + reminder.interval_minutes * 60000;
    const msUntilDue = dueAt - now;

    return (
        <div className="w-full container-theme flex items-center gap-2">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">Every {reminder.interval_minutes} min</span>
                    <span className={reminder.enabled ? 'text-c-green text-sm' : 'text-c-red text-sm'}>
                        {reminder.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                {reminder.enabled && (
                    <div className="text-sm text-c-subtext">
                        {msUntilDue <= 0 ? 'Due now' : `Next in ${FormatDuration(msUntilDue)}`}
                    </div>
                )}
                <div className="text-sm text-c-subtext">
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
