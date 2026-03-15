import {Dispatch, StateUpdater, useMemo, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {DashboardCard, DEFAULT_DASHBOARD} from './common';
import {LocalGetDashboard, LocalStoreDashboard} from '../../utils/localstate';
import {DashboardCardComponent} from './dashboard_card';
import {TagInput} from '../../components/tag_input';
import {TblUserTag} from '../../api/types';
import {TagToString} from '../../utils/tags';

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

let idCounter = 0;
const newId = () => `card-${Date.now()}-${idCounter++}`;

type EditDashboardPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
    handleAdd: (c: DashboardCard) => void;
};
export function EditDashboardPanel({namespaces, setNamespaces, handleAdd}: EditDashboardPanelProps) {
    const [addType, setAddType] = useState<DashboardCard['type']>('calories');
    const [tags, setTags] = useState<TblUserTag[]>([]);

    const addCard = () => {
        const card: DashboardCard = {
            id: '',
            type: addType,
            title: CHART_LABELS[addType],
            display: {range: '24 hours', group: 'sum'},
            visibleMacros: addType === 'macros' ? ['fat', 'carbs', 'fibre', 'protein'] : [],
            selectedTags: tags.map(TagToString),
        };

        handleAdd(card);
    };

    return (
        <div className="flex flex-col gap-2 p-2 mt-4 mb-8 container-theme">
            <div>
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
            </div>

            {addType === 'time' && (
                <>
                    <div>
                        <h2 className="text-lg font-bold">Tags</h2>
                        <TagInput namespaces={namespaces} setNamespaces={setNamespaces} thisTags={tags} onChange={setTags} />
                    </div>
                </>
            )}
        </div>
    );
}

export function StatsPage(state: BaseState) {
    const [cards, setCards] = useState<DashboardCard[]>(() => LocalGetDashboard() ?? DEFAULT_DASHBOARD);
    const [editing, setEditing] = useState(false);

    const updateCards = (next: DashboardCard[]) => {
        setCards(next);
        LocalStoreDashboard(next);
    };

    const handleUpdate = (index: number, card: DashboardCard) => {
        const next = cards.slice();
        next[index] = card;
        updateCards(next);
    };

    const handleRemove = (index: number) => {
        updateCards(cards.filter((_, i) => i !== index));
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) {
            return;
        }
        const next = cards.slice();
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        updateCards(next);
    };

    const handleMoveDown = (index: number) => {
        if (index === cards.length - 1) {
            return;
        }
        const next = cards.slice();
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        updateCards(next);
    };

    const handleAdd = (card: DashboardCard) => {
        card.id = newId();
        updateCards([card, ...cards]);
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    className={`px-3 py-1 ${editing ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                    onClick={() => setEditing(!editing)}
                >
                    {editing ? 'Done' : 'Edit Dashboard'}
                </button>
            </div>

            {editing && (
                <EditDashboardPanel namespaces={state.namespaces} setNamespaces={state.setNamespaces} handleAdd={handleAdd} />
            )}

            <div class="flex flex-col gap-16">
                {cards.map((card, index) => {
                    if (!state.user.show_diabetes && (card.type === 'blood_glucose' || card.type === 'insulin')) {
                        return null;
                    }
                    return (
                        <DashboardCardComponent
                            key={card.id}
                            card={card}
                            eventlogs={state.eventlogs}
                            bodylogs={state.bodylogs}
                            timespans={state.timespans}
                            dayOffsetSeconds={state.user.day_time_offset_seconds}
                            caloricCalcMethod={state.user.caloric_calc_method}
                            editing={editing}
                            isFirst={index === 0}
                            isLast={index === cards.length - 1}
                            namespaces={state.namespaces}
                            setNamespaces={state.setNamespaces}
                            onUpdate={(updated) => handleUpdate(index, updated)}
                            onRemove={() => handleRemove(index)}
                            onMoveUp={() => handleMoveUp(index)}
                            onMoveDown={() => handleMoveDown(index)}
                        />
                    );
                })}
            </div>
        </>
    );
}
