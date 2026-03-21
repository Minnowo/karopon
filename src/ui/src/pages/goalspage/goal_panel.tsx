import {useEffect, useState} from 'preact/hooks';
import {TblUserGoal, UserGoalProgress} from '../../api/types';
import {ApiGetUserGoalProgress} from '../../api/api';
import {SnakeCaseToTitle} from '../../utils/strings';
import {FormatDuration} from '../../utils/time';
import {DropdownButton} from '../../components/drop_down_button';

type GoalPanelProps = {
    goal: TblUserGoal;
    asOf: number;
    editGoal: (goal: TblUserGoal) => void;
    deleteGoal: (goal: TblUserGoal) => void;
};
export const GoalPanel = ({goal, asOf, editGoal, deleteGoal}: GoalPanelProps) => {
    const [progress, setProgress] = useState<UserGoalProgress | null>(null);

    useEffect(() => {
        setProgress(null);
        (async () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setProgress(await ApiGetUserGoalProgress({...goal, timezone, as_of: asOf}));
        })();
    }, [goal, asOf]);

    const barColor = (() => {
        switch (goal.target_col) {
            case 'CALORIES':
            case 'NET_CARBS':
            case 'CARBS':
            case 'STEPS':
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
                            onClick: () => confirm('Delete this goal?') && deleteGoal(goal),
                        },
                    ]}
                />
            </div>
            <p className="text-sm">
                Want {SnakeCaseToTitle(goal.target_col)} to be {SnakeCaseToTitle(goal.value_comparison)}{' '}
                {goal.target_value.toFixed(1)}
            </p>
            {progress ? (
                <>
                    <p>
                        Current: {progress.current_value.toFixed(1)} / {progress.target_value.toFixed(1)}
                    </p>
                    <p className="text-xs">Time remaining: {FormatDuration(progress.time_remaining)}</p>
                    <div className="w-full h-2 rounded mt-2">
                        <div
                            className={`${barColor} h-2 rounded`}
                            style={{
                                width: `${Math.min(100, (progress.current_value / progress.target_value) * 100)}%`,
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
