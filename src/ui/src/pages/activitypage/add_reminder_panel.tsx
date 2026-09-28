import {useState} from 'preact/hooks';
import {ActivityWithTag, ReminderActivityMode, ReminderAlarmMode} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {TimeInput} from '../../components/time_input';
import {PlayReminderSound, SOUND_OPTIONS} from '../../utils/sound';
import {
    AllDayEveryDayWindows,
    DAY_NAMES,
    FormatCronSchedule,
    MinutesToDate,
    ParseCronSchedule,
    ScheduleWindow,
} from './schedule_window';

type NewReminder = {
    enabled: boolean;
    intervalMinutes: number;
    activityIDs: number[];
    cron: string;
    activityMode: ReminderActivityMode;
    sound: string;
    name: string;
    alarmMode: ReminderAlarmMode;
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
    const [activityMode, setActivityMode] = useState<ReminderActivityMode>(initial?.activityMode ?? 'random');
    const [sound, setSound] = useState<string>(initial?.sound ?? 'chime');
    const [name, setName] = useState<string>(initial?.name ?? '');
    const [alarmMode, setAlarmMode] = useState<ReminderAlarmMode>(initial?.alarmMode ?? 'reminder');
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
        if (name.trim().length === 0) {
            setErrorMsg('Name cannot be empty');
            return;
        }

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

        onCreate({
            enabled,
            intervalMinutes,
            activityIDs,
            cron: FormatCronSchedule(windows),
            activityMode,
            sound,
            name: name.trim(),
            alarmMode,
        });
    };

    return (
        <div className={`rounded-sm p-2 border surface-1 ${className}`}>
            <h2 className="mb-4">{title}</h2>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col font-semibold gap-2">
                <label className="flex flex-col gap-1">
                    <span>Name</span>
                    <input
                        type="text"
                        className="w-full font-normal"
                        placeholder="Time to move"
                        value={name}
                        required
                        onInput={(e) => setName(e.currentTarget.value)}
                    />
                </label>

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
                        <h3 className="mb-0">Active windows</h3>
                        <div className="flex gap-2">
                            <button className="text-xs px-2 py-1" onClick={setAllDayEveryDay}>
                                Every day, all day
                            </button>
                            <button className="text-xs px-2 py-1" onClick={addWindow}>
                                Add window
                            </button>
                        </div>
                    </div>
                    <p className="text-sm font-normal text-c-on-surface-variant mb-1">
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
                                    <button className="btn-error text-xs" onClick={() => removeWindow(w.key)}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3>Break activities (optional)</h3>
                    <p className="text-sm font-normal text-c-on-surface-variant">
                        When this reminder fires, it will suggest activities from this list. Leave empty for a plain reminder with
                        no logging.
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

                <div>
                    <label className="flex flex-col gap-1">
                        <span>Notification type</span>
                        <select value={alarmMode} onChange={(e) => setAlarmMode(e.currentTarget.value as ReminderAlarmMode)}>
                            <option value="reminder">Reminder (normal notification)</option>
                            <option value="alarm">Alarm (rings full-screen, even if the app is closed)</option>
                        </select>
                    </label>
                </div>

                <div>
                    <label className="flex flex-col gap-1">
                        <span>When multiple activities are selected</span>
                        <select
                            value={activityMode}
                            onChange={(e) => setActivityMode(e.currentTarget.value as ReminderActivityMode)}
                        >
                            <option value="random">Pick one at random</option>
                            <option value="all">Show all</option>
                        </select>
                    </label>
                </div>

                <div className="flex flex-col gap-1">
                    <span>Sound</span>
                    <div className="flex flex-row gap-1">
                        <select value={sound} onChange={(e) => setSound(e.currentTarget.value)}>
                            {SOUND_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <button onClick={() => PlayReminderSound(sound)}> Play</button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
                <button className="btn-error" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn-success" onClick={onSaveClick}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}
