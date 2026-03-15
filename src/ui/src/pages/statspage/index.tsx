import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {DashboardCard, DEFAULT_DASHBOARD} from './common';
import {LocalGetDashboard, LocalStoreDashboard} from '../../utils/localstate';
import {DashboardCardComponent} from './dashboard_card';

const CHART_LABELS: Record<DashboardCard['type'], string> = {
    pie: 'Pie Chart',
    macros: 'Macronutrients',
    calories: 'Calories',
    blood_glucose: 'Blood Glucose',
    insulin: 'Insulin',
};

let idCounter = 0;
const newId = () => `card-${Date.now()}-${idCounter++}`;

export function StatsPage(state: BaseState) {
    const [cards, setCards] = useState<DashboardCard[]>(() => LocalGetDashboard() ?? DEFAULT_DASHBOARD);
    const [editing, setEditing] = useState(false);
    const [addType, setAddType] = useState<DashboardCard['type']>('calories');

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
        if (index === 0)  { return; }
        const next = cards.slice();
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        updateCards(next);
    };

    const handleMoveDown = (index: number) => {
        if (index === cards.length - 1) { return; }
        const next = cards.slice();
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        updateCards(next);
    };

    const handleAdd = () => {
        const card: DashboardCard = {
            id: newId(),
            type: addType,
            title: CHART_LABELS[addType],
            display: {range: '24 hours', group: 'sum'},
            visibleMacros: addType === 'macros' ? ['fat', 'carbs', 'fibre', 'protein'] : [],
        };
        updateCards([...cards, card]);
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    className={`px-3 py-1 border rounded ${editing ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                    onClick={() => setEditing(!editing)}
                >
                    {editing ? 'Done' : 'Edit Dashboard'}
                </button>
            </div>

            {cards.map((card, index) => {
                if (!state.user.show_diabetes && (card.type === 'blood_glucose' || card.type === 'insulin')) {
                    return null;
                }
                return (
                    <DashboardCardComponent
                        key={card.id}
                        card={card}
                        eventlogs={state.eventlogs}
                        dayOffsetSeconds={state.user.day_time_offset_seconds}
                        caloricCalcMethod={state.user.caloric_calc_method}
                        editing={editing}
                        isFirst={index === 0}
                        isLast={index === cards.length - 1}
                        onUpdate={(updated) => handleUpdate(index, updated)}
                        onRemove={() => handleRemove(index)}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                    />
                );
            })}

            {editing && (
                <div className="flex items-center gap-2 mt-4">
                    <span>Add chart:</span>
                    <select
                        className="px-2 py-1 border rounded"
                        value={addType}
                        onChange={(e) => setAddType((e.target as HTMLSelectElement).value as DashboardCard['type'])}
                    >
                        {(Object.keys(CHART_LABELS) as DashboardCard['type'][]).map((t) => (
                            <option key={t} value={t}>
                                {CHART_LABELS[t]}
                            </option>
                        ))}
                    </select>
                    <button className="px-3 py-1 border rounded" onClick={handleAdd}>
                        + Add
                    </button>
                </div>
            )}
        </>
    );
}
