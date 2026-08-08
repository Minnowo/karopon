import {Dispatch, StateUpdater, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {TaggedTimespan, TblUserBodyMetric, UserBodyLog, UserEventFoodLog} from '../../api/types';
import {ChartData, CommonRanges, DashboardCard, EventLogType, GraphStyle, MacroType, TimeRange} from './common';
import {PieChart} from './graph_pie_chart';
import {MultiLineGraph2} from './graph_line_multi2';
import {StackedBarGraph2} from './graph_bar_stacked2';
import {LineSingleGraph2} from './graph_line_single2';
import {TableGraph2} from './graph_table';
import {SplitTag, TagToString} from '../../utils/tags';
import {TagInput} from '../../components/tag_input';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {BuildTimeChartData, BuildTimeChartDataNetwork} from './data_build_time';
import {BuildBodyLogChartData, BuildBodyLogChartDataNetwork} from './data_build_other';
import {BuildMacroChartData, BuildMacroChartDataNetwork} from './data_build_macros';
import {BuildEventLogChartData, BuildEventLogChartDataNetwork} from './data_build_eventlogs';
import {FlipSwitch} from '../../components/flip_switch';
import {ParseRelativeTimeExpr} from '../../utils/timerange';
import {TimeRangeInput} from '../../components/timerange_input';
import {FormatSmartTimestamp2} from '../../utils/date_utils';
import {BodyMetricMultiSelect} from './body_metric_multiselect';
import {MacroMultiSelect} from './macro_multiselect';
import {EventLogMultiSelect} from './eventlog_multiselect';

const EMPTY_CHART_DATA: ChartData = {labels: [], rows: [], colors: []};

const TAG_COLOR_PALETTE = [
    'var(--color-c-red)',
    'var(--color-c-peach)',
    'var(--color-c-yellow)',
    'var(--color-c-green)',
    'var(--color-c-teal)',
    'var(--color-c-sky)',
    'var(--color-c-sapphire)',
    'var(--color-c-lavender)',
    'var(--color-c-mauve)',
    'var(--color-c-pink)',
    'var(--color-c-flamingo)',
];

const PRECISION_BY_TYPE: Partial<Record<DashboardCard['type'], number>> = {
    time: 2,
};

const MACRO_COLORS: Record<MacroType, string> = {
    fat: 'var(--color-c-flamingo)',
    carbs: 'var(--color-c-yellow)',
    net_carbs: 'var(--color-c-yellow)',
    fibre: 'var(--color-c-sapphire)',
    protein: 'var(--color-c-green)',
    calorie: 'var(--color-c-peach)',
};

const EVENTLOG_COLORS: Record<EventLogType, string> = {
    blood_glucose: 'var(--color-c-sky)',
    recommended_insulin_amount: 'var(--color-c-peach)',
    actual_insulin_taken: 'var(--color-c-green)',
};

const MULTI_SERIES_TYPES: Array<DashboardCard['type']> = ['macros', 'eventlogs', 'bodylog', 'time'];

type TimeRangePanelProps = {
    range: TimeRange;
    dayOffsetSeconds: number;
    canRemove: boolean;
    isFirst: boolean;
    isLast: boolean;
    onSave: (range: TimeRange) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
};

function TimeRangePanel({
    range,
    dayOffsetSeconds,
    canRemove,
    isFirst,
    isLast,
    onSave,
    onRemove,
    onMoveUp,
    onMoveDown,
}: TimeRangePanelProps) {
    const [draft, setDraft] = useState<TimeRange>(range);

    useEffect(() => {
        setDraft(range);
    }, [range]);

    const isDirty =
        draft.name !== range.name ||
        draft.rangeStart !== range.rangeStart ||
        draft.rangeEnd !== range.rangeEnd ||
        draft.groupBy !== range.groupBy ||
        draft.aggregationFunc !== range.aggregationFunc;

    const now = new Date();

    return (
        <div className="flex flex-col">
            <details className="w-full">
                <summary className="w-full cursor-pointer text-sm font-semibold">{range.name}</summary>
                <div className="flex flex-col p-2 container-theme gap-2">
                    <div className="flex flex-row gap-2">
                        <input
                            className="w-full"
                            type="text"
                            value={draft.name}
                            onInput={(e) => setDraft({...draft, name: (e.target as HTMLInputElement).value})}
                        />
                        <button className="ml-auto px-2" onClick={onMoveUp} disabled={isFirst}>
                            ↑
                        </button>
                        <button className="px-2" onClick={onMoveDown} disabled={isLast}>
                            ↓
                        </button>
                        <button className="delete-btn" onClick={onRemove} disabled={!canRemove}>
                            ✕
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label class="font-semibold text-sm">Start Time</label>
                        <div className="flex flex-row items-center">
                            <TimeRangeInput range={draft.rangeStart} onChange={(v) => setDraft({...draft, rangeStart: v})} />
                            <span className="flex w-full justify-center">
                                {FormatSmartTimestamp2(ParseRelativeTimeExpr(draft.rangeStart, now, dayOffsetSeconds / 1000))}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label class="font-semibold text-sm">End Time</label>
                        <div className="flex flex-row items-center">
                            <TimeRangeInput range={draft.rangeEnd} onChange={(v) => setDraft({...draft, rangeEnd: v})} />
                            <span className="flex w-full justify-center">
                                {FormatSmartTimestamp2(ParseRelativeTimeExpr(draft.rangeEnd, now, dayOffsetSeconds / 1000))}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label class="font-semibold text-sm">Group By</label>
                        <select
                            className="px-3 py-1"
                            value={draft.groupBy}
                            aria-label="Group by"
                            onInput={(e) => setDraft({...draft, groupBy: (e.target as HTMLSelectElement).value as GroupBy})}
                        >
                            {Object.values(GroupBy).map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label class="font-semibold text-sm">Aggregation</label>
                        <select
                            className="px-3 py-1"
                            value={draft.aggregationFunc}
                            aria-label="Aggregation function"
                            onInput={(e) =>
                                setDraft({...draft, aggregationFunc: (e.target as HTMLSelectElement).value as AggregationFunc})
                            }
                        >
                            {Object.values(AggregationFunc).map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button className="cancel-btn" onClick={() => setDraft(range)} disabled={!isDirty}>
                            Cancel
                        </button>
                        <button className="save-btn" onClick={() => onSave(draft)} disabled={!isDirty}>
                            Save
                        </button>
                    </div>
                </div>
            </details>
        </div>
    );
}

type DashboardCardProps = {
    card: DashboardCard;
    eventlogs: UserEventFoodLog[];
    bodylogs: UserBodyLog[];
    bodyMetrics: TblUserBodyMetric[];
    timespans: TaggedTimespan[];
    dayOffsetSeconds: number;
    caloricCalcMethod: string;
    editing: boolean;
    isFirst: boolean;
    isLast: boolean;
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    onUpdate: (card: DashboardCard) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
};

export function DashboardCardComponent({
    card,
    eventlogs,
    bodylogs,
    bodyMetrics,
    timespans,
    dayOffsetSeconds,
    caloricCalcMethod,
    editing,
    isFirst,
    isLast,
    namespaces,
    setNamespaces,
    tagColors,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
}: DashboardCardProps) {
    const thisRef = useRef<HTMLDivElement>(null);

    const [hiddenLabels, setHiddenLabels] = useState<string[]>(card.hiddenLabels ?? []);

    const [timeRanges, setTimeRanges] = useState<TimeRange[]>(() =>
        card.timeRanges && card.timeRanges.length > 0 ? card.timeRanges : CommonRanges
    );
    const [curTimeRange, setCurTimeRange] = useState<number>(card.curTimeRange ?? 0);
    const [groupBy, setGroupBy] = useState<GroupBy>(
        timeRanges && timeRanges.length > 0 && timeRanges.length > curTimeRange
            ? timeRanges[curTimeRange].groupBy
            : GroupBy.Minute
    );
    const [aggregationFunc, setAggregationFunc] = useState<AggregationFunc>(
        timeRanges && timeRanges.length > 0 && timeRanges.length > curTimeRange
            ? timeRanges[curTimeRange].aggregationFunc
            : AggregationFunc.Sum
    );

    const [chartData, setChartData] = useState<ChartData>(EMPTY_CHART_DATA);

    const {rangeStartMs, rangeEndMs, rangeStartStr, rangeEndStr} = useMemo(() => {
        const tr =
            timeRanges && timeRanges.length > 0 && timeRanges.length > curTimeRange ? timeRanges[curTimeRange] : CommonRanges[0];

        const offsetMs = dayOffsetSeconds / 1000;
        const now = new Date(Date.now() - offsetMs);
        const st = ParseRelativeTimeExpr(tr.rangeStart, now, offsetMs);
        const et = ParseRelativeTimeExpr(tr.rangeEnd, now, offsetMs);

        return {rangeStartMs: st.getTime(), rangeEndMs: et.getTime(), rangeStartStr: tr.rangeStart, rangeEndStr: tr.rangeEnd};
    }, [timeRanges, curTimeRange, dayOffsetSeconds]);

    useLayoutEffect(() => {
        switch (card.type) {
            case 'macros': {
                const selectedMacros = card.visibleMacros ?? [];
                if (selectedMacros.length === 0) {
                    return;
                }

                const macroColors = selectedMacros.map((m) => MACRO_COLORS[m]);

                if (card.useNetwork) {
                    BuildMacroChartDataNetwork(
                        rangeStartStr,
                        rangeEndStr,
                        groupBy,
                        aggregationFunc,
                        selectedMacros,
                        macroColors
                    ).then(setChartData);
                } else {
                    setChartData(
                        BuildMacroChartData(
                            eventlogs,
                            rangeStartMs,
                            rangeEndMs,
                            groupBy,
                            aggregationFunc,
                            caloricCalcMethod,
                            selectedMacros,
                            macroColors
                        )
                    );
                }

                break;
            }
            case 'time': {
                if (card.selectedTags?.length <= 0) {
                    return;
                }

                if (card.useNetwork) {
                    BuildTimeChartDataNetwork(
                        rangeStartStr,
                        rangeEndStr,
                        groupBy,
                        aggregationFunc,
                        card.selectedTags,
                        card.selectedTags.map((_, i) => TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length])
                    ).then(setChartData);
                } else {
                    setChartData(
                        BuildTimeChartData(
                            timespans,
                            rangeStartMs,
                            rangeEndMs,
                            groupBy,
                            aggregationFunc,
                            card.selectedTags,
                            card.selectedTags.map((_, i) => TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length])
                        )
                    );
                }

                break;
            }
            case 'eventlogs': {
                const selectedEventLogs = card.visibleEventLogs ?? [];
                if (selectedEventLogs.length === 0) {
                    return;
                }

                const eventLogColors = selectedEventLogs.map((m) => EVENTLOG_COLORS[m]);

                if (card.useNetwork) {
                    BuildEventLogChartDataNetwork(
                        rangeStartStr,
                        rangeEndStr,
                        groupBy,
                        aggregationFunc,
                        selectedEventLogs,
                        eventLogColors
                    ).then(setChartData);
                } else {
                    setChartData(
                        BuildEventLogChartData(
                            eventlogs,
                            rangeStartMs,
                            rangeEndMs,
                            groupBy,
                            aggregationFunc,
                            selectedEventLogs,
                            eventLogColors
                        )
                    );
                }

                break;
            }
            case 'bodylog': {
                const selectedMetrics = card.selectedMetrics ?? [];
                if (selectedMetrics.length === 0) {
                    return;
                }

                const colors = selectedMetrics.map((_, i) => TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length]);

                if (card.useNetwork) {
                    BuildBodyLogChartDataNetwork(
                        rangeStartStr,
                        rangeEndStr,
                        groupBy,
                        aggregationFunc,
                        selectedMetrics,
                        colors
                    ).then(setChartData);
                } else {
                    const metricNamesByID = new Map(bodyMetrics.map((m) => [m.id, m.name]));

                    setChartData(
                        BuildBodyLogChartData(
                            bodylogs,
                            rangeStartMs,
                            rangeEndMs,
                            groupBy,
                            aggregationFunc,
                            metricNamesByID,
                            selectedMetrics,
                            colors
                        )
                    );
                }

                break;
            }
        }
    }, [
        card.type,
        card.useNetwork,
        timeRanges,
        curTimeRange,
        aggregationFunc,
        groupBy,
        card.selectedTags,
        card.selectedMetrics,
        card.visibleMacros,
        card.visibleEventLogs,
        eventlogs,
        bodylogs,
        bodyMetrics,
        dayOffsetSeconds,
        rangeStartMs,
        rangeEndMs,
        rangeStartStr,
        rangeEndStr,
        caloricCalcMethod,
        timespans,
    ]);

    useLayoutEffect(() => {
        // used so that charts update their size when css editing styles change it.
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
    }, [editing]);

    const handleMoveUP = () => {
        onMoveUp();

        requestAnimationFrame(() => {
            thisRef.current?.scrollIntoView({
                block: 'center',
                behavior: 'instant',
            });
        });
    };

    const handleMoveDown = () => {
        onMoveDown();

        requestAnimationFrame(() => {
            thisRef.current?.scrollIntoView({
                block: 'center',
                behavior: 'instant',
            });
        });
    };

    const handleHiddenChange = (m: string[]) => {
        setHiddenLabels(m);
        onUpdate({...card, hiddenLabels: m});
    };

    const handleCurTimeRangeChange = (c: number) => {
        if (c >= 0 && c < timeRanges.length) {
            const r = timeRanges[c];
            setGroupBy(r.groupBy);
            setAggregationFunc(r.aggregationFunc);
        }
        setCurTimeRange(c);
        onUpdate({...card, curTimeRange: c});
    };

    const [addTemplateKey, setAddTemplateKey] = useState<string>('default-0');

    const handleAddTimeRange = () => {
        const [group, idxStr] = addTemplateKey.split('-');
        const idx = Number(idxStr);
        const template = group === 'current' ? timeRanges[idx] : CommonRanges[idx];

        const newRange: TimeRange = template
            ? {...template, name: `${template.name} Copy`}
            : {
                  name: 'New Range',
                  rangeStart: 'now-24h',
                  rangeEnd: 'now',
                  groupBy: GroupBy.Minute,
                  aggregationFunc: AggregationFunc.Sum,
              };
        const updated = [...timeRanges, newRange];
        setTimeRanges(updated);
        onUpdate({...card, timeRanges: updated});
    };

    const handleRemoveTimeRange = (index: number) => {
        const updated = timeRanges.filter((_, i) => i !== index);
        setTimeRanges(updated);

        const newCur = curTimeRange >= updated.length ? Math.max(0, updated.length - 1) : curTimeRange;
        setCurTimeRange(newCur);
        onUpdate({...card, timeRanges: updated, curTimeRange: newCur});
    };

    const handleMoveTimeRangeUp = (index: number) => {
        if (index <= 0) {
            return;
        }
        const updated = [...timeRanges];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        setTimeRanges(updated);
        onUpdate({...card, timeRanges: updated});
    };

    const handleMoveTimeRangeDown = (index: number) => {
        if (index >= timeRanges.length - 1) {
            return;
        }
        const updated = [...timeRanges];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        setTimeRanges(updated);
        onUpdate({...card, timeRanges: updated});
    };

    const handleTimeRangeSave = (index: number, updatedRange: TimeRange) => {
        const updated = timeRanges.map((r, i) => (i === index ? updatedRange : r));
        setTimeRanges(updated);
        onUpdate({...card, timeRanges: updated});
    };

    const graphStyle: GraphStyle = card.graphStyle ?? 'line';

    const handleGraphStyleChange = (s: GraphStyle) => {
        onUpdate({...card, graphStyle: s});
    };

    const MultiSeriesGraph2 =
        graphStyle === 'bar'
            ? StackedBarGraph2
            : graphStyle === 'table'
              ? TableGraph2
              : graphStyle === 'pie'
                ? PieChart
                : MultiLineGraph2;

    const baseGraphProps = {
        curTimeRange,
        onTimeRangeChange: handleCurTimeRangeChange,
        timeRanges,
        onTimeRangesChange: () => {
            /* TODO */
        },
        groupBy,
        onGroupByChange: setGroupBy,
        aggregationFunc,
        onAggregationFunc: setAggregationFunc,
        hiddenLabels,
        onHiddenLabelsChange: handleHiddenChange,
        hideZeroValues: card.hideZeroValues,
        hideValueLabels: card.hideValueLabels,
    };

    const renderChart = () => {
        const title = editing ? '' : card.title;

        const precision = PRECISION_BY_TYPE[card.type];

        if (MULTI_SERIES_TYPES.includes(card.type) || graphStyle !== 'line') {
            return (
                <MultiSeriesGraph2
                    title={title}
                    data={chartData}
                    precision={precision}
                    graphStyle={graphStyle}
                    onGraphStyleChange={handleGraphStyleChange}
                    {...baseGraphProps}
                />
            );
        }

        return (
            <LineSingleGraph2
                title={title}
                data={chartData}
                precision={precision}
                graphStyle={graphStyle}
                onGraphStyleChange={handleGraphStyleChange}
                {...baseGraphProps}
            />
        );
    };

    return (
        <div ref={thisRef} className={`${editing ? 'flex flex-col container-theme gap-2' : ''}`}>
            {editing && (
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <h1>Edit Chart</h1>
                        <div className="flex justify-end gap-1">
                            <button className="px-3 py-2" onClick={handleMoveUP} disabled={isFirst}>
                                ↑
                            </button>
                            <button className="px-3 py-2" onClick={handleMoveDown} disabled={isLast}>
                                ↓
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="font-semibold">Title</label>
                        <input
                            className="w-full px-2 py-1"
                            value={card.title}
                            aria-label="Card title"
                            onInput={(e) => onUpdate({...card, title: (e.target as HTMLInputElement).value})}
                        />
                    </div>
                    <div>
                        <label class="font-semibold">Time Ranges</label>
                        <div className="flex flex-col p-2 gap-2">
                            <div class="flex flex-row flex-wrap gap-2 items-center">
                                <select
                                    className="px-2 py-1"
                                    value={addTemplateKey}
                                    aria-label="Add from template"
                                    onChange={(e) => setAddTemplateKey((e.target as HTMLSelectElement).value)}
                                >
                                    <optgroup label="Defaults">
                                        {CommonRanges.map((r, i) => (
                                            <option key={`default-${i}`} value={`default-${i}`}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    {timeRanges.length > 0 && (
                                        <optgroup label="Current">
                                            {timeRanges.map((r, i) => (
                                                <option key={`current-${i}`} value={`current-${i}`}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <button className="px-3 py-1 wsnw" onClick={handleAddTimeRange}>
                                    + Add
                                </button>
                            </div>
                            {timeRanges.map((r, i) => (
                                <TimeRangePanel
                                    key={i}
                                    range={r}
                                    dayOffsetSeconds={dayOffsetSeconds}
                                    canRemove={timeRanges.length > 1}
                                    isFirst={i === 0}
                                    isLast={i === timeRanges.length - 1}
                                    onSave={(updated) => handleTimeRangeSave(i, updated)}
                                    onRemove={() => handleRemoveTimeRange(i)}
                                    onMoveUp={() => handleMoveTimeRangeUp(i)}
                                    onMoveDown={() => handleMoveTimeRangeDown(i)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label class="font-semibold">Other Options</label>
                        <div className="flex flex-col p-2 gap-2">
                            <label
                                className="flex items-center justify-between cursor-pointer"
                                title="If chart data should come from the server or only in-memory. If using large time ranges, this is recommended."
                            >
                                <span className="text-sm">Use Network Data</span>
                                <FlipSwitch value={card.useNetwork} onValueChanged={(v) => onUpdate({...card, useNetwork: v})} />
                            </label>
                            <label
                                className="flex items-center justify-between cursor-pointer"
                                title="Don't show the numeric value text for data points that are 0."
                            >
                                <span className="text-sm">Hide Zero Values</span>
                                <FlipSwitch
                                    value={card.hideZeroValues ?? false}
                                    onValueChanged={(v) => onUpdate({...card, hideZeroValues: v})}
                                />
                            </label>
                            <label
                                className="flex items-center justify-between cursor-pointer"
                                title="Don't show any numeric value text on the chart."
                            >
                                <span className="text-sm">Hide Value Labels</span>
                                <FlipSwitch
                                    value={card.hideValueLabels ?? false}
                                    onValueChanged={(v) => onUpdate({...card, hideValueLabels: v})}
                                />
                            </label>
                        </div>
                    </div>

                    {card.type === 'time' && (
                        <div className="flex flex-col gap-1">
                            <label class="font-semibold">Tags</label>
                            <div className="flex flex-col p-2 gap-2">
                                <TagInput
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    thisTags={card.selectedTags.map(SplitTag)}
                                    onChange={(tags) => onUpdate({...card, selectedTags: tags.map(TagToString)})}
                                    tagColors={tagColors}
                                />
                            </div>
                        </div>
                    )}

                    {card.type === 'bodylog' && (
                        <div className="flex flex-col gap-1">
                            <label class="font-semibold">Body Metrics</label>
                            <div className="flex flex-col p-2 gap-2">
                                <BodyMetricMultiSelect
                                    bodyMetrics={bodyMetrics}
                                    selected={card.selectedMetrics ?? []}
                                    onChange={(selectedMetrics) => onUpdate({...card, selectedMetrics})}
                                />
                            </div>
                        </div>
                    )}

                    {card.type === 'macros' && (
                        <div className="flex flex-col gap-1">
                            <label class="font-semibold">Macros / Calories</label>
                            <div className="flex flex-col p-2 gap-2">
                                <MacroMultiSelect
                                    selected={card.visibleMacros ?? []}
                                    onChange={(visibleMacros) => onUpdate({...card, visibleMacros})}
                                />
                            </div>
                        </div>
                    )}

                    {card.type === 'eventlogs' && (
                        <div className="flex flex-col gap-1">
                            <label class="font-semibold">Blood Glucose / Insulin</label>
                            <div className="flex flex-col p-2 gap-2">
                                <EventLogMultiSelect
                                    selected={card.visibleEventLogs ?? []}
                                    onChange={(visibleEventLogs) => onUpdate({...card, visibleEventLogs})}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <button className="px-2 py-1 delete-btn" onClick={onRemove}>
                            ✕ Remove
                        </button>
                    </div>
                    <hr className="my-4" />
                </div>
            )}
            {renderChart()}
        </div>
    );
}
