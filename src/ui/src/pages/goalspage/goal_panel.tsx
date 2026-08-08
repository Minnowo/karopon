import {useEffect, useState} from 'preact/hooks';
import {TblUserGoal} from '../../api/types';
import {SnakeCaseToTitle} from '../../utils/strings';
import {FormatDuration} from '../../utils/time';
import {DropdownButton} from '../../components/drop_down_button';
import {GetGoalCurrentValue, GoalTargetTimeRemaining} from './goal_progress';

type GoalPanelProps = {
    goal: TblUserGoal;
    dayOffsetSeconds: number;
    editGoal: (goal: TblUserGoal) => void;
    deleteGoal: (goal: TblUserGoal) => void;
};
export const GoalPanel = ({goal, dayOffsetSeconds, editGoal, deleteGoal}: GoalPanelProps) => {
    const [currentValue, setCurrentValue] = useState<number | null>(null);

    useEffect(() => {
        setCurrentValue(null);
        GetGoalCurrentValue(goal).then(setCurrentValue);
    }, [goal]);

    const timeRemaining = GoalTargetTimeRemaining(goal, dayOffsetSeconds);

    const barColor = (() => {
        switch (goal.target_col) {
            case 'CALORIES':
            case 'NET_CARBS':
            case 'CARBS':
                return 'bg-c-yellow';
            case 'FAT':
                return 'bg-c-flamingo';
            case 'FIBRE':
                return 'bg-c-sapphire';
            case 'PROTEIN':
                return 'bg-c-green';
            default:
                return 'bg-c-peach';
        }
    })();

    return (
        <div className="container-theme">
            <div className="flex flex-row justify-between">
                <h2 className="text-lg font-semibold">{goal.name}</h2>
                <DropdownButton
                    actions={[
                        {
                            label: 'Edit',
                            onClick: () => editGoal(goal),
                        },
                        {
                            label: 'Delete',
                            dangerous: true,
                            onClick: () => deleteGoal(goal),
                        },
                    ]}
                />
            </div>
            <p className="text-sm">
                Want {goal.target_col === 'BODY_METRIC' ? goal.target_metric : SnakeCaseToTitle(goal.target_col)} to be{' '}
                {SnakeCaseToTitle(goal.value_comparison)} {goal.target_value.toFixed(1)}
            </p>
            {currentValue !== null ? (
                <>
                    <p>
                        Current: {currentValue.toFixed(1)} / {goal.target_value.toFixed(1)}
                    </p>
                    <p className="text-xs">Time remaining: {FormatDuration(Math.max(0, timeRemaining))}</p>
                    <div className="w-full h-2 rounded mt-2 bg-c-surface2">
                        <div
                            className={`${barColor} h-2 rounded`}
                            style={{
                                width: `${Math.min(100, (currentValue / goal.target_value) * 100)}%`,
                            }}
                        />
                    </div>
                </>
            ) : (
                <p className="text-sm">Loading progress...</p>
            )}
        </div>
    );
};
