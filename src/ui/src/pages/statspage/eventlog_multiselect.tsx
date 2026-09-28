import {EventLogType, EventLogTypeKeys} from './common';

const EVENTLOG_LABELS: Record<EventLogType, string> = {
    blood_glucose: 'Blood Glucose',
    recommended_insulin_amount: 'Recommended Insulin',
    actual_insulin_taken: 'Actual Insulin Taken',
};

type EventLogMultiSelectProps = {
    selected: EventLogType[];
    onChange: (selected: EventLogType[]) => void;
};

export function EventLogMultiSelect({selected, onChange}: EventLogMultiSelectProps) {
    const toggle = (m: EventLogType) => {
        if (selected.includes(m)) {
            onChange(selected.filter((s) => s !== m));
        } else {
            onChange([...selected, m]);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            {EventLogTypeKeys.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(m)} onChange={() => toggle(m)} />
                    <span>{EVENTLOG_LABELS[m]}</span>
                </label>
            ))}
        </div>
    );
}
