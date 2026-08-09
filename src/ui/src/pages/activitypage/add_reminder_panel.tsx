import {useState} from 'preact/hooks';
import {ActivityWithTag} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';

type NewReminder = {
    enabled: boolean;
    intervalMinutes: number;
    activityIDs: number[];
};

type AddReminderPanelProps = {
    activities: ActivityWithTag[];
    title?: string;
    submitLabel?: string;
    initial?: NewReminder;
    onCreate: (reminder: NewReminder) => void;
    onCancel: () => void;
    className?: string;
};

export function AddReminderPanel({
    activities,
    title = 'Create New Reminder',
    submitLabel = 'Create',
    initial,
    onCreate,
    onCancel,
    className = '',
}: AddReminderPanelProps) {
    const [enabled, setEnabled] = useState<boolean>(initial?.enabled ?? true);
    const [intervalMinutes, setIntervalMinutes] = useState<number>(initial?.intervalMinutes ?? 45);
    const [activityIDs, setActivityIDs] = useState<number[]>(initial?.activityIDs ?? []);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const toggleActivity = (id: number) => {
        setActivityIDs((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
    };

    const onSaveClick = () => {
        if (intervalMinutes <= 0) {
            setErrorMsg('Interval must be a positive number');
            return;
        }

        onCreate({enabled, intervalMinutes, activityIDs});
    };

    return (
        <div className={`rounded-sm p-2 border container-theme ${className}`}>
            <div className="w-full mb-2 text-lg font-bold">{title}</div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col font-semibold gap-2">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.currentTarget.checked)} />
                    <span>Enabled</span>
                </label>

                <NumberInput
                    className="w-full"
                    innerClassName="w-full"
                    label={'Interval (min)'}
                    min={1}
                    value={intervalMinutes}
                    onValueChange={setIntervalMinutes}
                />

                <div>
                    <span className="font-semibold">Break activities (optional)</span>
                    <p className="text-sm font-normal text-c-subtext">
                        When this reminder fires, it will randomly suggest one of the selected activities. Leave empty for a plain
                        reminder with no logging.
                    </p>
                    {activities.length === 0 ? (
                        <p className="text-sm font-normal">No break activities have been created yet.</p>
                    ) : (
                        <div className="flex flex-col gap-1 mt-1">
                            {activities.map(({activity}) => (
                                <label key={activity.id} className="flex items-center gap-2 font-normal">
                                    <input
                                        type="checkbox"
                                        checked={activityIDs.includes(activity.id)}
                                        onChange={() => toggleActivity(activity.id)}
                                    />
                                    <span>{activity.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="save-btn" onClick={onSaveClick}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}
