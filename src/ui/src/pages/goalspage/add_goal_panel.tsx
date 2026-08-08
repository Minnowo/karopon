import {Dispatch, StateUpdater, useId, useMemo, useState} from 'preact/hooks';
import {
    GoalAggregationType,
    GoalAggregationTypeValues,
    GoalComparisonType,
    GoalComparisonTypeValues,
    GoalTargetColumn,
    GoalTargetColumnValues,
    GoalTimeExpr,
    GoalTimeExprValues,
    TblUserBodyMetric,
    TblUserGoal,
} from '../../api/types';
import {ChangeEvent} from 'preact/compat';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {SnakeCaseToTitle} from '../../utils/strings';
import {TagInput} from '../../components/tag_input';
import {SplitTag, TagToString} from '../../utils/tags';
import {DecodeGoalTags, EncodeGoalTags} from './goal_progress';

type Props = {
    userGoal: TblUserGoal;
    bodyMetrics: TblUserBodyMetric[];
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    onCreated: (goal: TblUserGoal) => void;
    onUpdated?: (goal: TblUserGoal) => void;
    onCancel: () => void;
    className?: string;
};

export function GoalCreationPanel({
    userGoal,
    bodyMetrics,
    namespaces,
    setNamespaces,
    onCreated,
    onUpdated,
    onCancel,
    className = '',
}: Props) {
    const [error, setError] = useState<string | null>(null);
    const goal = useMemo(() => ({...userGoal}), [userGoal]);
    const render = DoRender();
    const isEditing = onUpdated !== undefined;

    const timeRangeId = useId();
    const aggregationId = useId();
    const targetId = useId();
    const targetMetricId = useId();
    const comparisonId = useId();
    const targetValueId = useId();

    const doCreateOrUpdate = () => {
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
        if (goal.target_col === 'BODY_METRIC' && !goal.target_metric) {
            setError('Please select a body metric.');
            return;
        }
        if (goal.target_col === 'TIME' && DecodeGoalTags(goal.target_metric).length === 0) {
            setError('Please select at least one tag.');
            return;
        }

        if (isEditing) {
            onUpdated({...goal});
        } else {
            onCreated({...goal});
        }
    };

    return (
        <div className={`container-theme ${className}`}>
            <div className="flex justify-between">
                <h2 className="text-lg font-semibold">{isEditing ? 'Edit Goal' : 'Create a New Goal'}</h2>
            </div>
            <ErrorDiv errorMsg={error} />

            <div className="flex flex-col gap-2">
                <input
                    className="px-2 py-1 mt-1 w-full"
                    value={goal.name}
                    placeholder="Your goal name"
                    title="Enter the name of your goal here"
                    aria-label="Goal name"
                    onInput={(e) => (goal.name = (e.target as HTMLInputElement).value)}
                    required
                />

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1" title="Time Range is the interval for the goal to start, finish, and repeat.">
                        <label className="block text-sm font-medium" htmlFor={timeRangeId}>
                            Time Range
                        </label>
                        <select
                            id={timeRangeId}
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

                    <div className="flex-1" title="Aggregation is how your current progress should be counted and grouped.">
                        <label className="block text-sm font-medium" htmlFor={aggregationId}>
                            Aggregation
                        </label>
                        <select
                            id={aggregationId}
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
                    <div className="flex-1" title="Target defines what kind of data is your goal for.">
                        <label className="block text-sm font-medium" htmlFor={targetId}>
                            Target
                        </label>
                        <select
                            id={targetId}
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
                        className="flex-1"
                        title="Comparison is how your currently progress value should be compared to your target value."
                    >
                        <label className="block text-sm font-medium" htmlFor={comparisonId}>
                            Comparison
                        </label>
                        <select
                            id={comparisonId}
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

                {goal.target_col === 'BODY_METRIC' && (
                    <div title="The specific body metric this goal tracks.">
                        <label className="block text-sm font-medium" htmlFor={targetMetricId}>
                            Body Metric
                        </label>
                        {bodyMetrics.length === 0 ? (
                            <div className="text-sm text-faded">No body metrics defined yet.</div>
                        ) : (
                            <select
                                id={targetMetricId}
                                className="border rounded px-2 py-1 w-full"
                                value={goal.target_metric}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    goal.target_metric = e.currentTarget.value;
                                    render();
                                }}
                            >
                                <option value="" disabled>
                                    Select a body metric
                                </option>
                                {[...bodyMetrics]
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((m) => (
                                        <option key={m.id} value={m.name}>
                                            {m.name}
                                            {m.unit ? ` (${m.unit})` : ''}
                                        </option>
                                    ))}
                            </select>
                        )}
                    </div>
                )}

                {goal.target_col === 'TIME' && (
                    <div title="Tags this goal tracks. Their durations are summed together.">
                        <label className="block text-sm font-medium" htmlFor={targetMetricId}>
                            Tags
                        </label>
                        <TagInput
                            id={targetMetricId}
                            namespaces={namespaces}
                            setNamespaces={setNamespaces}
                            thisTags={DecodeGoalTags(goal.target_metric).map(SplitTag)}
                            onChange={(tags) => {
                                goal.target_metric = EncodeGoalTags(tags.map(TagToString));
                                render();
                            }}
                        />
                    </div>
                )}

                <div title="Target value is the target number you want to reach.">
                    <label className="block text-sm font-medium" htmlFor={targetValueId}>
                        Target Value
                    </label>
                    <NumberInput
                        id={targetValueId}
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
                    {goal.target_col === 'BODY_METRIC'
                        ? goal.target_metric || '...'
                        : goal.target_col === 'TIME'
                          ? DecodeGoalTags(goal.target_metric).join(', ') || '...'
                          : SnakeCaseToTitle(goal.target_col)}{' '}
                    to be {SnakeCaseToTitle(goal.value_comparison)} {goal.target_value}
                    {goal.target_col === 'TIME' ? ' hours' : ''}.
                </div>

                <div className="flex justify-end gap-2">
                    <button className="cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="save-btn" onClick={doCreateOrUpdate}>
                        {isEditing ? 'Update Goal' : 'Create Goal'}
                    </button>
                </div>
            </div>
        </div>
    );
}
