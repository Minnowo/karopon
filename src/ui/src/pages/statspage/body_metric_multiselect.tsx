import {TblUserBodyMetric} from '../../api/types';

type BodyMetricMultiSelectProps = {
    bodyMetrics: TblUserBodyMetric[];
    selected: string[];
    onChange: (selected: string[]) => void;
};

export function BodyMetricMultiSelect({bodyMetrics, selected, onChange}: BodyMetricMultiSelectProps) {
    const toggle = (name: string) => {
        if (selected.includes(name)) {
            onChange(selected.filter((s) => s !== name));
        } else {
            onChange([...selected, name]);
        }
    };

    if (bodyMetrics.length === 0) {
        return <div className="text-sm text-c-on-surface-variant">No body metrics defined yet.</div>;
    }

    return (
        <div className="flex flex-col gap-1">
            {[...bodyMetrics]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={selected.includes(m.name)} onChange={() => toggle(m.name)} />
                        <span>
                            {m.name}
                            {m.unit && <span className="text-c-on-surface-variant"> ({m.unit})</span>}
                        </span>
                    </label>
                ))}
        </div>
    );
}
