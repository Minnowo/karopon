import {useMemo, useState} from 'preact/hooks';
import {
    GoalAggregationType,
    GoalAggregationTypeValues,
    GoalComparisonType,
    GoalComparisonTypeValues,
    GoalTargetColumn,
    GoalTargetColumnValues,
    GoalTimeExpr,
    GoalTimeExprValues,
    TblUserGoal,
} from '../../api/types';
import {ChangeEvent} from 'preact/compat';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {SnakeCaseToTitle} from '../../utils/strings';

type Props = {
    userGoal: TblUserGoal;
    onCreated: (goal: TblUserGoal) => void;
    className?: string;
};

export function GoalCreationPanel({userGoal, onCreated, className = ''}: Props) {
    const [error, setError] = useState<string | null>(null);
    const goal = useMemo(() => ({...userGoal}), [userGoal]);
    const render = DoRender();

    const onCreate = () => {
        setError(null);

        goal.name = goal.name.trim();

        if (goal.name === '') {
            setError('The goal name cannot be empty.');
            return;
        }
        if (goal.target_value < 0) {
            setError('The target value must be > 0.');
            return;
        }

        onCreated({...goal});
    };

    return (
        <div className={`rounded-sm p-2 border container-theme ${className}`}>
            <h2 className="text-lg font-semibold">Create a New Goal</h2>
            <ErrorDiv errorMsg={error} />

            <div className="flex flex-col gap-2">
                <input
                    className="border rounded px-2 py-1 w-full"
                    value={goal.name}
                    placeholder="Your goal name"
                    title="Enter the name of your goal here"
                    onInput={(e) => (goal.name = (e.target as HTMLInputElement).value)}
                    required
                />

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="w-full" title="Time Range is the interval for the goal to start, finish, and repeat.">
                        <label className="block text-sm font-medium">Time Range</label>
                        <select
                            className="border rounded px-2 py-1 w-full"
                            value={goal.time_expr}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                goal.time_expr = e.currentTarget.value as GoalTimeExpr;
                                render();
                            }}
                        >
                            {GoalTimeExprValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full" title="Aggregation is how your current progress should be counted and grouped.">
                        <label className="block text-sm font-medium">Aggregation</label>
                        <select
                            className="border rounded px-2 py-1 w-full"
                            value={goal.aggregation_type}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                goal.aggregation_type = e.currentTarget.value as GoalAggregationType;

                                render();
                            }}
                        >
                            {GoalAggregationTypeValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="w-full" title="Target defines what kind of data is your goal for.">
                        <label className="block text-sm font-medium">Target</label>
                        <select
                            className="border rounded px-2 py-1 w-full"
                            value={goal.target_col}
                            onChange={(e) => {
                                goal.target_col = e.currentTarget.value as GoalTargetColumn;

                                render();
                            }}
                        >
                            {GoalTargetColumnValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div
                        className="w-full"
                        title="Comparison is how your currently progress value should be compared to your target value."
                    >
                        <label className="block text-sm font-medium">Comparison</label>
                        <select
                            className="border rounded px-2 py-1 w-full"
                            value={goal.value_comparison}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                goal.value_comparison = e.currentTarget.value as GoalComparisonType;
                                render();
                            }}
                        >
                            {GoalComparisonTypeValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div title="Target value is the target number you want to reach.">
                    <label className="block text-sm font-medium">Target Value</label>
                    <NumberInput
                        innerClassName="w-full"
                        value={goal.target_value}
                        onValueChange={(value: number) => {
                            goal.target_value = value;
                            render();
                        }}
                    />
                </div>

                <div>
                    My {SnakeCaseToTitle(goal.time_expr)} goal is for the {SnakeCaseToTitle(goal.aggregation_type)} of my{' '}
                    {SnakeCaseToTitle(goal.target_col)} to be {SnakeCaseToTitle(goal.value_comparison)} {goal.target_value}.
                </div>

                <div className="flex sm:justify-end">
                    <button className="bg-c-green font-bold my-1 w-full sm:w-32" onClick={onCreate}>
                        Create Goal
                    </button>
                </div>
            </div>
        </div>
    );
}
