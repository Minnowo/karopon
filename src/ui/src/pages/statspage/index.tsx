import {Dispatch, StateUpdater, useEffect, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {DashboardCard, DEFAULT_DASHBOARD, UserDashboard} from './common';
import {ApiDeleteDashboard, ApiGetDashboards, ApiNewDashboard, ApiUpdateDashboard} from '../../api/api';
import {DashboardCardComponent} from './dashboard_card';
import {TagInput} from '../../components/tag_input';
import {TblUserDashboard, TblUserTag} from '../../api/types';
import {TagToString} from '../../utils/tags';
import {DashboardComponent} from './dashboard';

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
    const [curDashboard, setCurDashboard] = useState<number>(0);

    const newDashboard = () => {
        ApiNewDashboard(DEFAULT_DASHBOARD.name, JSON.stringify(DEFAULT_DASHBOARD.cards)).then((db) =>
            state.setDashboards([...state.dashboards, db])
        );
    };

    const onUpdate = (dashboard: UserDashboard) => {
        const udb = {
            id: dashboard.id,
            user_id: state.user.id,
            name: dashboard.name,
            data: JSON.stringify(dashboard.cards),
        };

        ApiUpdateDashboard(udb.id, udb.name, udb.data).then(() =>
            state.setDashboards(state.dashboards.map((db) => (db.id === dashboard.id ? udb : db)))
        );
    };

    const onDelete = (dashboard: UserDashboard) => {
        ApiDeleteDashboard(dashboard.id).then(() => state.setDashboards(state.dashboards.filter((db) => db.id !== dashboard.id)));
    };

    return (
        <>
            <div className="flex justify-center mb-4">
                <button className={`px-3 py-1 text-c-text`} onClick={newDashboard}>
                    New Dashboard
                </button>

                {state.dashboards.map((db, i) => (
                    <button
                        key={db.id}
                        className={`px-3 py-1 ${curDashboard === i ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                        onClick={() => setCurDashboard(i)}
                    >
                        {db.name}
                    </button>
                ))}
            </div>

            {curDashboard >= 0 && curDashboard < state.dashboards.length && (
                <DashboardComponent
                    key={state.dashboards[curDashboard].id}
                    baseState={state}
                    dashboard={state.dashboards[curDashboard]}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            )}
        </>
    );
}
