import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {DashboardCard, UserDashboard} from './common';
import {DashboardCardComponent} from './dashboard_card';
import {DoRender} from '../../hooks/doRender';
import {EditDashboardPanel} from '.';
import {TblUserDashboard} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';

type DashboardProps = {
    baseState: BaseState;
    dashboard: TblUserDashboard;
    onUpdate: (dashboard: UserDashboard) => void;
    onDelete: (dashboard: UserDashboard) => void;
};

export const DashboardComponent = ({baseState, dashboard, onUpdate, onDelete}: DashboardProps) => {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [cancelUpdate, setCancelUpdate] = useState(false);

    const dashboardRef = useMemo(() => {
        if (cancelUpdate) {
            // just for dependency array
        }

        let parsed = null;
        try {
            parsed = JSON.parse(dashboard.data);
        } catch (e) {
            if (e instanceof Error) {
                setErrorMsg(e.message);
            } else {
                setErrorMsg(`An unknown error occurred: ${e}`);
            }
        }

        const db = {
            id: dashboard.id,
            name: dashboard.name,
            cards: parsed !== null && Array.isArray(parsed) ? parsed : [],
        } as UserDashboard;

        for (let i = 0; i < db.cards.length; i++) {
            db.cards[i].id = i;
        }

        return {
            db,
            newCardId: db.cards.length,
        };
    }, [dashboard, cancelUpdate]);

    const render = DoRender();

    const toggleCancelEdit = () => {
        if (editing) {
            setCancelUpdate((x) => !x);
            setEditing(false);
        } else {
            setEditing(true);
        }
    };

    const doSave = () => {
        onUpdate(dashboardRef.db);
        setEditing(false);
    };

    const handleAdd = (card: DashboardCard) => {
        card.id = ++dashboardRef.newCardId;
        dashboardRef.db.cards = [card, ...dashboardRef.db.cards];
        render();
    };

    const handleRemove = (index: number) => {
        dashboardRef.db.cards = dashboardRef.db.cards.filter((_, i) => i !== index);
        render();
    };

    const handleUpdate = (index: number, card: DashboardCard) => {
        dashboardRef.db.cards[index] = card;
        render();
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) {
            return;
        }

        const next = dashboardRef.db.cards;
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        render();
    };

    const handleMoveDown = (index: number) => {
        if (index === dashboardRef.db.cards.length - 1) {
            return;
        }

        const next = dashboardRef.db.cards;
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        render();
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button className={`w-24 ${editing && 'bg-c-red font-bold'}`} onClick={toggleCancelEdit}>
                    {editing ? 'Cancel' : 'Edit Dashboard'}
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {editing && (
                <>
                    <button className={`w-24 bg-c-red font-bold`} onClick={() => onDelete(dashboardRef.db)}>
                        Delete
                    </button>
                    <button className={`w-24 bg-c-green font-bold`} onClick={doSave}>
                        Save
                    </button>
                    <EditDashboardPanel
                        namespaces={baseState.namespaces}
                        setNamespaces={baseState.setNamespaces}
                        handleAdd={handleAdd}
                    />
                </>
            )}

            <div class="flex flex-col gap-16">
                {dashboardRef.db.cards.map((card, index) => {
                    return (
                        <DashboardCardComponent
                            key={card.id}
                            card={card}
                            eventlogs={baseState.eventlogs}
                            bodylogs={baseState.bodylogs}
                            timespans={baseState.timespans}
                            dayOffsetSeconds={baseState.user.day_time_offset_seconds}
                            caloricCalcMethod={baseState.user.caloric_calc_method}
                            namespaces={baseState.namespaces}
                            setNamespaces={baseState.setNamespaces}
                            editing={editing}
                            isFirst={index === 0}
                            isLast={index === dashboardRef.db.cards.length - 1}
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
};
