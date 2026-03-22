import {Dispatch, StateUpdater, useState} from 'preact/hooks';
import {DashboardCard} from './common';
import {TblUserTag} from '../../api/types';
import {TagToString} from '../../utils/tags';
import {TagInput} from '../../components/tag_input';

const CHART_LABELS: Record<DashboardCard['type'], string> = {
    pie: 'Pie Chart',
    macros: 'Macronutrients',
    calories: 'Calories',
    blood_glucose: 'Blood Glucose',
    insulin: 'Insulin',
    body_weight: 'Body Weight (kg)',
    body_height: 'Height (cm)',
    body_fat: 'Body Fat (%)',
    body_bmi: 'BMI',
    bp_systolic: 'Blood Pressure - Systolic',
    bp_diastolic: 'Blood Pressure - Diastolic',
    bp_combined: 'Blood Pressure (Sys + Dia)',
    heart_rate: 'Heart Rate (bpm)',
    steps: 'Steps',
    time: 'Time Spent by Tag',
};

type DashboardSettingsPanelProps = {
    titleLabel: string;
    initialName: string;
    confirmLabel: string;
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
    tagColors?: Map<string, string>;
    onConfirm: (name: string) => void;
    onDelete?: () => void;
    onCancel: () => void;
    onCardAdded?: (c: DashboardCard) => void;
};
export function AddEditDashboardPanel({
    titleLabel,
    initialName,
    confirmLabel,
    namespaces,
    setNamespaces,
    tagColors,
    onCardAdded,
    onConfirm,
    onDelete,
    onCancel,
}: DashboardSettingsPanelProps) {
    const [name, setName] = useState(initialName);
    const [addType, setAddType] = useState<DashboardCard['type']>('calories');
    const [tags, setTags] = useState<TblUserTag[]>([]);

    const addCard = () => {
        if (!onCardAdded) {
            return;
        }
        const card: DashboardCard = {
            id: 0,
            type: addType,
            title: CHART_LABELS[addType],
            display: {range: '24 hours', group: 'sum'},
            visibleMacros: addType === 'macros' ? ['fat', 'carbs', 'fibre', 'protein'] : [],
            selectedTags: tags.map(TagToString),
        };

        onCardAdded(card);
    };

    return (
        <div className="flex flex-col gap-2 p-2 mt-4 mb-4 container-theme">
            <h2 className="text-lg font-bold">{titleLabel}</h2>
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    className="w-full px-2 py-1"
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder="View name"
                />
            </div>

            {onCardAdded && (
                <>
                    <h2 className="text-lg font-bold">Add Chart</h2>
                    <div class="flex gap-2 items-center ">
                        <select
                            className="w-full px-2 py-1"
                            value={addType}
                            onChange={(e) => setAddType((e.target as HTMLSelectElement).value as DashboardCard['type'])}
                        >
                            {(Object.keys(CHART_LABELS) as Array<DashboardCard['type']>).map((t) => (
                                <option key={t} value={t}>
                                    {CHART_LABELS[t]}
                                </option>
                            ))}
                        </select>
                        <button className="px-3 py-1 wsnw" onClick={addCard}>
                            + Add
                        </button>
                    </div>

                    {addType === 'time' && (
                        <div className="container-theme">
                            <h2 className="text-lg font-bold">Tags</h2>
                            <TagInput
                                namespaces={namespaces}
                                setNamespaces={setNamespaces}
                                thisTags={tags}
                                onChange={setTags}
                                tagColors={tagColors}
                            />
                        </div>
                    )}
                </>
            )}

            <div className="flex justify-between">
                {onDelete ? (
                    <button className="delete-btn" onClick={onDelete}>
                        Delete
                    </button>
                ) : (
                    <div> </div>
                )}
                <div className="flex gap-2">
                    <button className="cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="save-btn" onClick={() => onConfirm(name)}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
