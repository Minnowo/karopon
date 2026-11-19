import {useMemo, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {DEFAULT_DASHBOARD, UserDashboard} from './common';
import {ApiDeleteDashboard, ApiError, ApiNewDashboard, ApiUpdateDashboard} from '../../api/api';
import {ErrorDivMsg} from '../../components/error_div';
import {DashboardComponent} from './dashboard';
import {AddEditDashboardPanel} from './add_edit_dashboard_panel';

export function StatsPage(state: BaseState) {
    const [curDashboard, setCurDashboard] = useState<number>(0);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [adding, setAdding] = useState<boolean>(false);
    const [addError, setAddError] = useState<ErrorDivMsg | null>(null);

    const tagColorMap = useMemo(() => {
        const m = new Map();
        for (const c of state.tagColors) {
            m.set(c.namespace, c.color);
        }
        return m;
    }, [state.tagColors]);

    const onAdd = (name: string) => {
        if (adding) {
            return;
        }
        setAdding(true);
        setAddError(null);
        ApiNewDashboard(name || DEFAULT_DASHBOARD.name, JSON.stringify(DEFAULT_DASHBOARD.cards))
            .then((db) => {
                const newIndex = state.dashboards.length;
                state.setDashboards([...state.dashboards, db]);
                setCurDashboard(newIndex);
                setShowAddPanel(false);
            })
            .catch((e: unknown) => {
                if (e instanceof ApiError && e.isUnauthorizedError()) {
                    state.doRefresh();
                }
                setAddError(e instanceof Error ? e : String(e));
            })
            .finally(() => setAdding(false));
    };

    const onUpdate = (dashboard: UserDashboard): Promise<void> => {
        const udb = {
            id: dashboard.id,
            user_id: state.user.id,
            name: dashboard.name,
            data: JSON.stringify(dashboard.cards),
        };

        return ApiUpdateDashboard(udb.id, udb.name, udb.data).then(() =>
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
            <div className="w-full flex flex-wrap justify-evenly gap-2 my-4">
                <button
                    onClick={() => {
                        setAddError(null);
                        setShowAddPanel(true);
                    }}
                >
                    New View
                </button>
                {state.dashboards.length > 0 && (
                    <select
                        className="px-2 max-w-32 sm:max-w-4/6"
                        value={curDashboard}
                        aria-label="Select dashboard"
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
                    initialName=""
                    confirmLabel="Create View"
                    saving={adding}
                    error={addError}
                    onConfirm={onAdd}
                    onCancel={() => setShowAddPanel(false)}
                />
            )}

            {curDashboard >= 0 && curDashboard < state.dashboards.length && (
                <DashboardComponent
                    key={state.dashboards[curDashboard].id}
                    baseState={state}
                    tagColors={tagColorMap}
                    dashboard={state.dashboards[curDashboard]}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            )}
        </>
    );
}
