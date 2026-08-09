import {useState} from 'preact/hooks';
import {ActivityWithTag} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {TimeInput} from '../../components/time_input';
import {
    AllDayEveryDayWindows,
    DAY_NAMES,
    FormatCronSchedule,
    MinutesToDate,
    ParseCronSchedule,
    ScheduleWindow,
} from '../../utils/reminder_schedule';

type NewReminder = {
    enabled: boolean;
    intervalMinutes: number;
    activityIDs: number[];
    cron: string;
};

type AddReminderPanelProps = {
    activities: ActivityWithTag[];
    // Whether time entry should show 12-hour (with AM/PM) or 24-hour time, matching
    // the user's time_format preference - same as TimeInput usage elsewhere (e.g.
    // timepage/timer_panel.tsx).
    hour12: boolean;
    title?: string;
    submitLabel?: string;
    initial?: NewReminder;
    onCreate: (reminder: NewReminder) => void;
    onCancel: () => void;
    className?: string;
};

let nextRowKey = 0;

export function AddReminderPanel({
    activities,
    hour12,
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
    const [windows, setWindows] = useState<Array<ScheduleWindow & {key: number}>>(() =>
        ParseCronSchedule(initial?.cron ?? '').map((w) => ({...w, key: nextRowKey++}))
    );
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const toggleActivity = (id: number) => {
        setActivityIDs((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
    };

    const addWindow = () => {
        setWindows((old) => [...old, {key: nextRowKey++, dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60}]);
    };

    const removeWindow = (key: number) => {
        setWindows((old) => old.filter((w) => w.key !== key));
    };

    const updateWindow = (key: number, changes: Partial<ScheduleWindow>) => {
        setWindows((old) => old.map((w) => (w.key === key ? {...w, ...changes} : w)));
    };

    const setAllDayEveryDay = () => {
        setWindows(AllDayEveryDayWindows().map((w) => ({...w, key: nextRowKey++})));
    };

    const onSaveClick = () => {
        if (intervalMinutes <= 0) {
            setErrorMsg('Interval must be a positive number');
            return;
        }

        if (windows.length === 0) {
            setErrorMsg('Add at least one active window - a reminder never fires without one');
            return;
        }

        for (const w of windows) {
            if (w.endMinute < w.startMinute) {
                setErrorMsg("A window's end time cannot be before its start time");
                return;
            }
        }

        onCreate({enabled, intervalMinutes, activityIDs, cron: FormatCronSchedule(windows)});
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
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Active windows</span>
                        <div className="flex gap-2">
                            <button className="text-xs px-2 py-1" onClick={setAllDayEveryDay}>
                                Every day, all day
                            </button>
                            <button className="text-xs px-2 py-1" onClick={addWindow}>
                                Add window
                            </button>
                        </div>
                    </div>
                    <p className="text-sm font-normal text-c-subtext mb-1">
                        This reminder can only fire during these day/time windows. At least one is required.
                    </p>

                    {windows.length === 0 ? (
                        <p className="text-sm font-normal">No windows added yet.</p>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {windows.map((w) => (
                                <div key={w.key} className="flex items-center gap-2 font-normal flex-wrap">
                                    <select
                                        value={w.dayOfWeek}
                                        onChange={(e) => updateWindow(w.key, {dayOfWeek: parseInt(e.currentTarget.value, 10)})}
                                    >
                                        {DAY_NAMES.map((name, i) => (
                                            <option key={i} value={i}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                    <TimeInput
                                        label="Start"
                                        value={MinutesToDate(w.startMinute)}
                                        onChange={(d) => updateWindow(w.key, {startMinute: d.getHours() * 60 + d.getMinutes()})}
                                        hour12={hour12}
                                    />
                                    <span>to</span>
                                    <TimeInput
                                        label="End"
                                        value={MinutesToDate(w.endMinute)}
                                        onChange={(d) => updateWindow(w.key, {endMinute: d.getHours() * 60 + d.getMinutes()})}
                                        hour12={hour12}
                                    />
                                    <button className="cancel-btn text-xs px-2 py-1" onClick={() => removeWindow(w.key)}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
