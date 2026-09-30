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
        return <small>No body metrics defined yet.</small>;
    }

    return (
        <div className="flex flex-col gap-1">
            {[...bodyMetrics]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(m.name)} onChange={() => toggle(m.name)} />
                        <span>
                            {m.name}
                            {m.unit && <small> ({m.unit})</small>}
                        </span>
                    </label>
                ))}
        </div>
    );
}
