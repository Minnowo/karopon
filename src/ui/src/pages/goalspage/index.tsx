import {useRef, useState} from 'preact/hooks';
import {RefreshOnUnauthorized} from '../../utils/error';
import {BaseState} from '../../state/basestate';
import {TblUserGoal} from '../../api/types';
import {ApiDeleteUserGoal, ApiError, ApiNewUserGoal, ApiUpdateUserGoal} from '../../api/api';
import {GoalCreationPanel} from './add_goal_panel';
import {NewTblUserGoal} from '../../api/factories';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {GoalPanel} from './goal_panel';
import {LoadMore, useListPaging} from '../../components/load_more';

export function GoalsPage(state: BaseState) {
    const [showNewGoalPanel, setShowNewGoalPanel] = useState<boolean>(false);
    const [editingGoal, setEditingGoal] = useState<TblUserGoal | null>(null);
    const newGoal = useRef<TblUserGoal>(NewTblUserGoal({target_value: 1500}));
    const paging = useListPaging({total: state.goals.length});

    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);

    const handleErr = (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsg(e);
            if (e.isUnauthorizedError()) {
                state.doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsg(e);
        } else {
            setErrorMsg(`An unknown error occurred: ${e}`);
        }
    };

    // createGoal and updateGoal reject with the API error so the form can show it.
    const createGoal = (goal: TblUserGoal): Promise<void> => {
        return ApiNewUserGoal(goal)
            .then((g) => {
                newGoal.current = NewTblUserGoal({target_value: 1500});
                state.setGoals((oldGoals) => [g, ...oldGoals]);
                setShowNewGoalPanel(false);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const updateGoal = (goal: TblUserGoal): Promise<void> => {
        return ApiUpdateUserGoal(goal)
            .then((updated) => {
                state.setGoals((oldGoals) => oldGoals.map((g) => (g.id === updated.id ? updated : g)));
                setEditingGoal(null);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const deleteGoal = (goal: TblUserGoal) => {
        if (confirm('Delete this goal?')) {
            ApiDeleteUserGoal(goal)
                .then(() => state.setGoals((oldGoals) => oldGoals.filter((g) => g.id !== goal.id)))
                .catch(handleErr);
        }
    };

    return (
        <>
            <div className="flex flex-wrap justify-evenly my-4 gap-2">
                <button
                    onClick={() => {
                        setShowNewGoalPanel(true);
                        newGoal.current = NewTblUserGoal({target_value: 1500});
                    }}
                >
                    New Goal
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewGoalPanel && (
                <GoalCreationPanel
                    onCreated={createGoal}
                    onCancel={() => setShowNewGoalPanel(false)}
                    userGoal={newGoal.current}
                    bodyMetrics={state.bodyMetrics}
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                />
            )}

            {editingGoal !== null && (
                <GoalCreationPanel
                    key={editingGoal.id}
                    userGoal={editingGoal}
                    onCreated={createGoal}
                    onUpdated={updateGoal}
                    onCancel={() => setEditingGoal(null)}
                    bodyMetrics={state.bodyMetrics}
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                />
            )}

            <div className="grid gap-4">
                {state.goals.length === 0 ? (
                    <h3 className="text-center py-32">No goals found.</h3>
                ) : (
                    <div ref={paging.listRef} className="contents">
                        {state.goals.slice(0, paging.shown).map((g: TblUserGoal) => (
                            <GoalPanel
                                key={g.id}
                                goal={g}
                                dayOffsetSeconds={state.user.day_time_offset_seconds}
                                editGoal={(goal) => setEditingGoal(goal)}
                                deleteGoal={deleteGoal}
                            />
                        ))}
                    </div>
                )}
            </div>

            <LoadMore paging={paging} itemsName="goals" />
        </>
    );
}
