import {useEffect, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserGoal, UserGoalProgress} from '../../api/types';
import {ApiDeleteUserGoal, ApiError, ApiGetUserGoalProgress, ApiNewUserGoal} from '../../api/api';
import {GoalCreationPanel} from './add_goal_panel';
import {FormatDuration} from '../../utils/time';
import {NewTblUserGoal} from '../../api/factories';
import {ErrorDiv} from '../../components/error_div';
import {DropdownButton} from '../../components/drop_down_button';

export function GoalsPage(state: BaseState) {
    const [progressMap, setProgressMap] = useState<Record<number, UserGoalProgress>>({});
    const [showNewGoalPanel, setShowNewGoalPanel] = useState<boolean>(false);
    const newGoal = useRef<TblUserGoal>(NewTblUserGoal({target_value: 1500}));

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleErr = (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsg(e.message);
            if (e.isUnauthorizedError()) {
                state.doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsg(e.message);
        } else {
            setErrorMsg(`An unknown error occurred: ${e}`);
        }
    };

    useEffect(() => {
        (async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const progMap: Record<number, UserGoalProgress> = {};
            for (const g of state.goals) {
                const prog = await ApiGetUserGoalProgress({...g, timezone});
                progMap[g.id] = prog;
            }
            setProgressMap(progMap);
        })();
    }, [state.goals]);

    const createGoal = (goal: TblUserGoal) => {
        ApiNewUserGoal(goal)
            .then((g) => {
                newGoal.current = NewTblUserGoal({target_value: 1500});
                state.setGoals((oldGoals) => (oldGoals === null ? null : [g, ...oldGoals]));
            })
            .catch(handleErr);
    };

    const deleteGoal = (goal: TblUserGoal) => {
        ApiDeleteUserGoal(goal)
            .then(() => state.setGoals((oldGoals) => (oldGoals === null ? null : oldGoals.filter((g) => g.id !== goal.id))))
            .catch(handleErr);
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-24 ${showNewGoalPanel && 'bg-c-l-red font-bold'}`}
                    onClick={() => {
                        setShowNewGoalPanel((x) => !x);
                        newGoal.current = NewTblUserGoal({target_value: 1500});
                    }}
                >
                    {!showNewGoalPanel ? 'New Goal' : 'Cancel'}
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewGoalPanel && <GoalCreationPanel className="mb-4" onCreated={createGoal} userGoal={newGoal.current} />}

            <div className="grid gap-4">
                {state.goals.length === 0 ? (
                    <p>No goals found.</p>
                ) : (
                    state.goals.map((g: TblUserGoal) => {
                        const progress = progressMap[g.id];

                        return (
                            <div key={g.id} className="container-theme p-2">
                                <div className="flex flex-row justify-between">
                                    <h2 className="text-lg font-semibold">{g.name}</h2>
                                    <DropdownButton
                                        actions={[
                                            {
                                                label: 'Delete',
                                                dangerous: true,
                                                onClick: () => confirm('Delete this goal?') && deleteGoal(g),
                                            },
                                        ]}
                                    />
                                </div>
                                <p className="text-sm">
                                    Want {g.target_col} to be {g.value_comparison} {g.target_value.toFixed(1)}
                                </p>
                                {progress ? (
                                    <>
                                        <p>
                                            Current: {progress.current_value.toFixed(1)} / {progress.target_value.toFixed(1)}
                                        </p>
                                        <p className="text-xs">Time remaining: {FormatDuration(progress.time_remaining)}</p>
                                        <div className="w-full h-2 rounded mt-2">
                                            <div
                                                className="bg-c-blue h-2 rounded"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        (progress.current_value / progress.target_value) * 100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm">Loading progress...</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}
