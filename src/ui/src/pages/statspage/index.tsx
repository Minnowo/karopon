import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {DEFAULT_DASHBOARD, UserDashboard} from './common';
import {ApiDeleteDashboard, ApiNewDashboard, ApiUpdateDashboard} from '../../api/api';
import {DashboardComponent} from './dashboard';
import {AddEditDashboardPanel} from './add_edit_dashboard_panel';

export function StatsPage(state: BaseState) {
    const [curDashboard, setCurDashboard] = useState<number>(0);
    const [showAddPanel, setShowAddPanel] = useState(false);

    const onAdd = (name: string) => {
        ApiNewDashboard(name || DEFAULT_DASHBOARD.name, JSON.stringify(DEFAULT_DASHBOARD.cards)).then((db) => {
            const newIndex = state.dashboards.length;
            state.setDashboards([...state.dashboards, db]);
            setCurDashboard(newIndex);
            setShowAddPanel(false);
        });
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
        if (confirm('Do you want to delete this dashboard?')) {
            ApiDeleteDashboard(dashboard.id).then(() => {
                const next = state.dashboards.filter((db) => db.id !== dashboard.id);
                state.setDashboards(next);
                setCurDashboard((i) => Math.min(i, Math.max(0, next.length - 1)));
            });
        }
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button disabled={showAddPanel} className="wsnw px-3" onClick={() => setShowAddPanel(true)} title="New Dashboard">
                    New View
                </button>
                {state.dashboards.length > 0 && (
                    <select
                        className="px-2 max-w-32 sm:max-w-4/6"
                        value={curDashboard}
                        onChange={(e) => setCurDashboard(Number((e.target as HTMLSelectElement).value))}
                    >
                        {state.dashboards.map((db, i) => (
                            <option key={db.id} value={i}>
                                {db.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {showAddPanel && (
                <AddEditDashboardPanel
                    titleLabel="New View"
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    initialName=""
                    confirmLabel="Create"
                    onConfirm={onAdd}
                    onCancel={() => setShowAddPanel(false)}
                />
            )}

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
