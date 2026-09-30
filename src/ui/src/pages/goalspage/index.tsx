import {useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserGoal} from '../../api/types';
import {ApiDeleteUserGoal, ApiError, ApiNewUserGoal, ApiUpdateUserGoal} from '../../api/api';
import {GoalCreationPanel} from './add_goal_panel';
import {NewTblUserGoal} from '../../api/factories';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {GoalPanel} from './goal_panel';
import {NumberInput} from '../../components/number_input';

export function GoalsPage(state: BaseState) {
    const [showNewGoalPanel, setShowNewGoalPanel] = useState<boolean>(false);
    const [editingGoal, setEditingGoal] = useState<TblUserGoal | null>(null);
    const newGoal = useRef<TblUserGoal>(NewTblUserGoal({target_value: 1500}));
    const [numberToShow, setNumberToShow] = useState<number>(15);

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

    const createGoal = (goal: TblUserGoal) => {
        ApiNewUserGoal(goal)
            .then((g) => {
                newGoal.current = NewTblUserGoal({target_value: 1500});
                state.setGoals((oldGoals) => [g, ...oldGoals]);
                setShowNewGoalPanel(false);
            })
            .catch(handleErr);
    };

    const updateGoal = (goal: TblUserGoal) => {
        ApiUpdateUserGoal(goal)
            .then((updated) => {
                state.setGoals((oldGoals) => oldGoals.map((g) => (g.id === updated.id ? updated : g)));
                setEditingGoal(null);
            })
            .catch(handleErr);
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
                    disabled={showNewGoalPanel}
                    onClick={() => {
                        setShowNewGoalPanel(true);
                        newGoal.current = NewTblUserGoal({target_value: 1500});
                    }}
                >
                    New Goal
                </button>
                <NumberInput label={'Show Last'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewGoalPanel && (
                <GoalCreationPanel
                    className="mb-4"
                    onCreated={createGoal}
                    onCancel={() => setShowNewGoalPanel(false)}
                    userGoal={newGoal.current}
                    bodyMetrics={state.bodyMetrics}
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                />
            )}

            <div className="grid gap-4">
                {state.goals.length === 0 ? (
                    <h3 className="text-center py-32">No goals found.</h3>
                ) : (
                    state.goals
                        .slice(0, numberToShow)
                        .map((g: TblUserGoal) =>
                            editingGoal?.id === g.id ? (
                                <GoalCreationPanel
                                    key={g.id}
                                    userGoal={editingGoal}
                                    onCreated={createGoal}
                                    onUpdated={updateGoal}
                                    onCancel={() => setEditingGoal(null)}
                                    bodyMetrics={state.bodyMetrics}
                                    namespaces={state.namespaces}
                                    setNamespaces={state.setNamespaces}
                                />
                            ) : (
                                <GoalPanel
                                    key={g.id}
                                    goal={g}
                                    dayOffsetSeconds={state.user.day_time_offset_seconds}
                                    editGoal={(goal) => setEditingGoal((prev) => (prev?.id === goal.id ? null : goal))}
                                    deleteGoal={deleteGoal}
                                />
                            )
                        )
                )}
            </div>
        </>
    );
}
