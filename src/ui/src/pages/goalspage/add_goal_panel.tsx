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
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';
import {SnakeCaseToTitle} from '../../utils/strings';
import {TagInput} from '../../components/tag_input';
import {SplitTag, TagToString} from '../../utils/tags';
import {DecodeGoalTags, EncodeGoalTags} from './goal_progress';

type Props = {
    userGoal: TblUserGoal;
    bodyMetrics: TblUserBodyMetric[];
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    // onCreated and onUpdated save the goal; they reject with an ApiError when the server refuses it.
    onCreated: (goal: TblUserGoal) => Promise<void>;
    onUpdated?: (goal: TblUserGoal) => Promise<void>;
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
    const [error, setError] = useState<ErrorDivMsg | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState<boolean>(false);
    const goal = useMemo(() => ({...userGoal}), [userGoal]);
    const render = DoRender();
    const isEditing = onUpdated !== undefined;

    const timeRangeId = useId();
    const aggregationId = useId();
    const targetId = useId();
    const targetMetricId = useId();
    const comparisonId = useId();
    const targetValueId = useId();
    const nameId = useId();

    // Field ids by the server's JSON Pointer, in the order the fields appear.
    const fieldIds = new Map<string, string>([
        ['#/name', nameId],
        ['#/time_expr', timeRangeId],
        ['#/aggregation_type', aggregationId],
        ['#/target_col', targetId],
        ['#/value_comparison', comparisonId],
        ['#/target_metric', targetMetricId],
        ['#/target_value', targetValueId],
    ]);

    // invalidProps returns the aria attributes for the field at pointer.
    const invalidProps = (pointer: string) => ({
        'aria-invalid': fieldErrors.has(pointer) || undefined,
        'aria-describedby': fieldErrors.has(pointer) ? `${fieldIds.get(pointer)}-error` : undefined,
    });

    // errorFor renders the server's message for the field at pointer.
    const errorFor = (pointer: string) => <FieldError id={`${fieldIds.get(pointer)}-error`} message={fieldErrors.get(pointer)} />;

    const clearFieldError = (pointer: string) => {
        setFieldErrors((prev) => {
            if (!prev.has(pointer)) {
                return prev;
            }
            const next = new Map(prev);
            next.delete(pointer);
            return next;
        });
    };

    const doCreateOrUpdate = () => {
        if (saving) {
            return;
        }
        setError(null);
        setFieldErrors(new Map());
        setSaving(true);

        const save = isEditing ? onUpdated({...goal}) : onCreated({...goal});
        save.catch((e: unknown) => {
            if (!(e instanceof ApiError)) {
                setError(e instanceof Error ? e : String(e));
                return;
            }
            const errs = e.fieldErrors();
            setFieldErrors(errs);
            setError(e);
            for (const [pointer, id] of fieldIds) {
                if (errs.has(pointer)) {
                    document.getElementById(id)?.focus();
                    break;
                }
            }
        }).finally(() => setSaving(false));
    };

    return (
        <div className={`surface-1 flex flex-col gap-4 ${className}`}>
            <h2>{isEditing ? 'Edit Goal' : 'Create a New Goal'}</h2>

            <div className="flex flex-col gap-2">
                <input
                    className="w-full"
                    value={goal.name}
                    placeholder="Your goal name"
                    title="Enter the name of your goal here"
                    aria-label="Goal name"
                    id={nameId}
                    {...invalidProps('#/name')}
                    onInput={(e) => {
                        goal.name = (e.target as HTMLInputElement).value;
                        clearFieldError('#/name');
                    }}
                />
                {errorFor('#/name')}

                <div className="flex flex-col sm:flex-row gap-2">
                    <div
                        className="flex-1 flex flex-col gap-1"
                        title="Time Range is the interval for the goal to start, finish, and repeat."
                    >
                        <label htmlFor={timeRangeId}>Time Range</label>
                        <select
                            id={timeRangeId}
                            {...invalidProps('#/time_expr')}
                            className="w-full"
                            value={goal.time_expr}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                goal.time_expr = e.currentTarget.value as GoalTimeExpr;
                                clearFieldError('#/time_expr');
                                render();
                            }}
                        >
                            {GoalTimeExprValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        {errorFor('#/time_expr')}
                    </div>

                    <div
                        className="flex-1 flex flex-col gap-1"
                        title="Aggregation is how your current progress should be counted and grouped."
                    >
                        <label htmlFor={aggregationId}>Aggregation</label>
                        <select
                            id={aggregationId}
                            {...invalidProps('#/aggregation_type')}
                            className="w-full"
                            value={goal.aggregation_type}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                goal.aggregation_type = e.currentTarget.value as GoalAggregationType;
                                clearFieldError('#/aggregation_type');

                                render();
                            }}
                        >
                            {GoalAggregationTypeValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        {errorFor('#/aggregation_type')}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 flex flex-col gap-1" title="Target defines what kind of data is your goal for.">
                        <label htmlFor={targetId}>Target</label>
                        <select
                            id={targetId}
                            {...invalidProps('#/target_col')}
                            className="w-full"
                            value={goal.target_col}
                            onChange={(e) => {
                                goal.target_col = e.currentTarget.value as GoalTargetColumn;
                                clearFieldError('#/target_col');

                                render();
                            }}
                        >
                            {GoalTargetColumnValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        {errorFor('#/target_col')}
                    </div>

                    <div
                        className="flex-1 flex flex-col gap-1"
                        title="Comparison is how your currently progress value should be compared to your target value."
                    >
                        <label htmlFor={comparisonId}>Comparison</label>
                        <select
                            id={comparisonId}
                            {...invalidProps('#/value_comparison')}
                            className="w-full"
                            value={goal.value_comparison}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                goal.value_comparison = e.currentTarget.value as GoalComparisonType;
                                clearFieldError('#/value_comparison');
                                render();
                            }}
                        >
                            {GoalComparisonTypeValues.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        {errorFor('#/value_comparison')}
                    </div>
                </div>

                {goal.target_col === 'BODY_METRIC' && (
                    <div className="flex flex-col gap-1" title="The specific body metric this goal tracks.">
                        <label htmlFor={targetMetricId}>Body Metric</label>
                        {bodyMetrics.length === 0 ? (
                            <small>No body metrics defined yet.</small>
                        ) : (
                            <select
                                id={targetMetricId}
                                {...invalidProps('#/target_metric')}
                                className="w-full"
                                value={goal.target_metric}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    goal.target_metric = e.currentTarget.value;
                                    clearFieldError('#/target_metric');
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
                        {errorFor('#/target_metric')}
                    </div>
                )}

                {goal.target_col === 'TIME' && (
                    <div className="flex flex-col gap-1" title="Tags this goal tracks. Their durations are summed together.">
                        <label htmlFor={targetMetricId}>Tags</label>
                        <TagInput
                            id={targetMetricId}
                            namespaces={namespaces}
                            setNamespaces={setNamespaces}
                            thisTags={DecodeGoalTags(goal.target_metric).map(SplitTag)}
                            invalid={fieldErrors.has('#/target_metric')}
                            errorId={`${targetMetricId}-error`}
                            onChange={(tags) => {
                                goal.target_metric = EncodeGoalTags(tags.map(TagToString));
                                clearFieldError('#/target_metric');
                                render();
                            }}
                        />
                        {errorFor('#/target_metric')}
                    </div>
                )}

                <div className="flex flex-col gap-1" title="Target value is the target number you want to reach.">
                    <label htmlFor={targetValueId}>Target Value</label>
                    <NumberInput
                        id={targetValueId}
                        innerClassName="w-full"
                        value={goal.target_value}
                        invalid={fieldErrors.has('#/target_value')}
                        errorId={`${targetValueId}-error`}
                        onValueChange={(value: number) => {
                            goal.target_value = value;
                            clearFieldError('#/target_value');
                            render();
                        }}
                    />
                    {errorFor('#/target_value')}
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

                <ErrorDiv errorMsg={error} />

                <div className="flex justify-end gap-2">
                    <button onClick={onCancel}>Cancel</button>
                    <button className="btn-success" aria-disabled={saving || undefined} onClick={doCreateOrUpdate}>
                        {isEditing ? 'Update Goal' : 'Create Goal'}
                    </button>
                </div>
            </div>
        </div>
    );
}
