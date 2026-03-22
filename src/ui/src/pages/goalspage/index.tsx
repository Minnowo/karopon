import {useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserGoal} from '../../api/types';
import {ApiDeleteUserGoal, ApiError, ApiNewUserGoal, ApiUpdateUserGoal} from '../../api/api';
import {GoalCreationPanel} from './add_goal_panel';
import {NewTblUserGoal} from '../../api/factories';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {GoalPanel} from './goal_panel';

export function GoalsPage(state: BaseState) {
    const [showNewGoalPanel, setShowNewGoalPanel] = useState<boolean>(false);
    const [editingGoal, setEditingGoal] = useState<TblUserGoal | null>(null);
    const newGoal = useRef<TblUserGoal>(NewTblUserGoal({target_value: 1500}));
    const [selectedDate, setSelectedDate] = useState<string>('');

    const asOf = selectedDate
        ? (() => {
              // gets the set date with nows time
              const now = new Date();
              const [y, m, d] = selectedDate.split('-').map(Number);
              return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).getTime();
          })()
        : 0;

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
        ApiDeleteUserGoal(goal)
            .then(() => state.setGoals((oldGoals) => oldGoals.filter((g) => g.id !== goal.id)))
            .catch(handleErr);
    };

    return (
        <>
            <div className="flex justify-evenly my-4 gap-2">
                <button
                    disabled={showNewGoalPanel}
                    className="w-24"
                    onClick={() => {
                        setShowNewGoalPanel(true);
                        newGoal.current = NewTblUserGoal({target_value: 1500});
                    }}
                >
                    New Goal
                </button>
                <input type="date" value={selectedDate} onInput={(e) => setSelectedDate((e.target as HTMLInputElement).value)} />
                {selectedDate && <button onClick={() => setSelectedDate('')}>Today</button>}
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewGoalPanel && (
                <GoalCreationPanel
                    className="mb-4"
                    onCreated={createGoal}
                    onCancel={() => setShowNewGoalPanel(false)}
                    userGoal={newGoal.current}
                />
            )}

            <div className="grid gap-4">
                {state.goals.length === 0 ? (
                    <p>No goals found.</p>
                ) : (
                    state.goals.map((g: TblUserGoal) =>
                        editingGoal?.id === g.id ? (
                            <GoalCreationPanel
                                key={g.id}
                                userGoal={editingGoal}
                                onCreated={createGoal}
                                onUpdated={updateGoal}
                                onCancel={() => setEditingGoal(null)}
                            />
                        ) : (
                            <GoalPanel
                                key={g.id}
                                goal={g}
                                asOf={asOf}
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
