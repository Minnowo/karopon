import {MacroType, MacroTypeKeys} from './common';

const MACRO_LABELS: Record<MacroType, string> = {
    fat: 'Fat',
    carbs: 'Carbs',
    net_carbs: 'Net Carbs',
    fibre: 'Fibre',
    protein: 'Protein',
    calorie: 'Calories',
};

type MacroMultiSelectProps = {
    selected: MacroType[];
    onChange: (selected: MacroType[]) => void;
};

export function MacroMultiSelect({selected, onChange}: MacroMultiSelectProps) {
    const toggle = (m: MacroType) => {
        if (selected.includes(m)) {
            onChange(selected.filter((s) => s !== m));
        } else {
            onChange([...selected, m]);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            {MacroTypeKeys.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(m)} onChange={() => toggle(m)} />
                    <span>{MACRO_LABELS[m]}</span>
                </label>
            ))}
        </div>
    );
}
