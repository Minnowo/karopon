import {Dispatch, StateUpdater, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {TaggedTimespan, TblUserBodyMetric, UserBodyLog, UserEventFoodLog} from '../../api/types';
import {ChartData, CommonRanges, DashboardCard, EventLogType, GraphStyle, MacroType, TimeUnit} from './common';
import {PieChart} from './graph_pie_chart';
import {MultiLineGraph2} from './graph_line_multi2';
import {StackedBarGraph2} from './graph_bar_stacked2';
import {LineSingleGraph2} from './graph_line_single2';
import {TableGraph2} from './graph_table';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {BuildTimeChartData, BuildTimeChartDataNetwork} from './data_build_time';
import {BuildBodyLogChartData, BuildBodyLogChartDataNetwork} from './data_build_other';
import {BuildMacroChartData, BuildMacroChartDataNetwork} from './data_build_macros';
import {BuildEventLogChartData, BuildEventLogChartDataNetwork} from './data_build_eventlogs';
import {ParseRelativeTimeExpr} from '../../utils/timerange';
import {DropdownButton} from '../../components/drop_down_button';
import {DashboardCardEditor} from './dashboard_card_editor';
import {FormatDuration} from '../../utils/time';

const EMPTY_CHART_DATA: ChartData = {labels: [], rows: [], colors: []};

// All 3 tiers (pale/default, light, dark/vivid) of all 5 wheel hues, grouped
// by tier rather than by hue - the 5 base hues are the most mutually
// distinct, so they're first in the rotation and a 5-series chart never
// touches the light/dark tiers at all.
const TAG_COLOR_PALETTE = [
    'var(--color-c-red)',
    'var(--color-c-yellow)',
    'var(--color-c-green)',
    'var(--color-c-blue)',
    'var(--color-c-pink)',
    'var(--color-c-l-red)',
    'var(--color-c-l-yellow)',
    'var(--color-c-l-green)',
    'var(--color-c-l-blue)',
    'var(--color-c-l-pink)',
    'var(--color-c-d-red)',
    'var(--color-c-d-yellow)',
    'var(--color-c-d-green)',
    'var(--color-c-d-blue)',
    'var(--color-c-d-pink)',
];

// Time builders return hours; scale is the multiplier into each unit.
const TIME_UNITS: Record<TimeUnit, {abbr: string; scale: number; precision: number; format?: (h: number) => string}> = {
    hours: {abbr: 'h', scale: 1, precision: 2},
    minutes: {abbr: 'min', scale: 60, precision: 0},
    days: {abbr: 'd', scale: 1 / 24, precision: 2},
    mixed: {abbr: '', scale: 1, precision: 2, format: (h) => FormatDuration(Math.round(h * 60) * 60_000)},
};

const MACRO_UNITS: Record<MacroType, string> = {
    fat: 'g',
    carbs: 'g',
    net_carbs: 'g',
    fibre: 'g',
    protein: 'g',
    calorie: 'kcal',
};

const MACRO_COLORS: Record<MacroType, string> = {
    fat: 'var(--color-c-pink)',
    carbs: 'var(--color-c-yellow)',
    net_carbs: 'var(--color-c-yellow)',
    fibre: 'var(--color-c-blue)',
    protein: 'var(--color-c-green)',
    calorie: 'var(--color-c-red)',
};

const EVENTLOG_COLORS: Record<EventLogType, string> = {
    blood_glucose: 'var(--color-c-l-blue)',
    recommended_insulin_amount: 'var(--color-c-red)',
    actual_insulin_taken: 'var(--color-c-green)',
};

const EVENTLOG_UNITS: Record<EventLogType, string> = {
    blood_glucose: 'mmol/L',
    recommended_insulin_amount: 'u',
    actual_insulin_taken: 'u',
};

const MULTI_SERIES_TYPES: Array<DashboardCard['type']> = ['macros', 'eventlogs', 'bodylog', 'time'];

// Only these require rebuilding (and possibly refetching) the chart data, so only
// these can leave the drawn chart out of date. Everything else - graph style, the
// hide/show toggles - is render-only and applies immediately.
const DATA_KEYS = [
    'type',
    'useNetwork',
    'timeRanges',
    'selectedTags',
    'selectedMetrics',
    'visibleMacros',
    'visibleEventLogs',
] as const;

const DataFingerprint = (card: DashboardCard): string => JSON.stringify(DATA_KEYS.map((k) => card[k]));

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
    saving: boolean;
    saveError: string | null;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSave: (card: DashboardCard) => void;
    onDuplicate: () => void;
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
    saving,
    saveError,
    onStartEdit,
    onCancelEdit,
    onSave,
    onDuplicate,
    onRemove,
    onMoveUp,
    onMoveDown,
}: DashboardCardProps) {
    const thisRef = useRef<HTMLDivElement>(null);

    // While editing, the editor works on this draft; nothing is written back to
    // the dashboard until Save.
    const [draft, setDraft] = useState<DashboardCard | null>(editing ? card : null);

    // The chart renders from this snapshot rather than the live draft, so editing
    // a field doesn't rebuild (or refetch) the chart on every keystroke. The
    // editor's Refresh Chart button advances it.
    const [previewCard, setPreviewCard] = useState<DashboardCard>(card);

    // Ephemeral while browsing, so poking a chart doesn't dirty the dashboard.
    // While editing, the selected range and group-by instead live on the draft, so
    // Save keeps them as the chart's defaults for next time the page opens.
    const [hiddenLabels, setHiddenLabels] = useState<string[]>(card.hiddenLabels ?? []);
    const [viewTimeRange, setViewTimeRange] = useState<number>(card.curTimeRange ?? 0);
    const [groupByOverride, setGroupByOverride] = useState<GroupBy | null>(null);
    const [graphStyleOverride, setGraphStyleOverride] = useState<GraphStyle | null>(null);

    // Entering or leaving edit mode resets both, so a refreshed-but-unsaved
    // preview doesn't survive a Cancel.
    useEffect(() => {
        setDraft(editing ? card : null);
        setPreviewCard(card);
        setViewTimeRange(card.curTimeRange ?? 0);
    }, [editing]);

    // A save landing (or an external change) is the new baseline to draw from.
    useEffect(() => {
        setPreviewCard(card);
        setViewTimeRange(card.curTimeRange ?? 0);
    }, [card]);

    // Data comes from the snapshot; render-only options come from the draft so
    // they take effect as soon as they're toggled.
    const preview = previewCard;
    const live = draft ?? card;
    const previewStale = draft !== null && DataFingerprint(draft) !== DataFingerprint(previewCard);

    const [chartData, setChartData] = useState<ChartData>(EMPTY_CHART_DATA);

    const timeRanges = preview.timeRanges && preview.timeRanges.length > 0 ? preview.timeRanges : CommonRanges;
    const curTimeRange = draft ? (draft.curTimeRange ?? 0) : viewTimeRange;
    const selectedRange = timeRanges[Math.min(Math.max(0, curTimeRange), timeRanges.length - 1)] ?? CommonRanges[0];

    // Both follow the selected range unless the chart's own control overrides
    // them, so editing a range definition takes effect without extra wiring.
    const groupBy = groupByOverride ?? selectedRange.groupBy;
    const aggregationFunc: AggregationFunc = selectedRange.aggregationFunc;
    const graphStyle: GraphStyle = graphStyleOverride ?? live.graphStyle ?? 'line';

    const {rangeStartMs, rangeEndMs, rangeStartStr, rangeEndStr} = useMemo(() => {
        const offsetMs = dayOffsetSeconds / 1000;
        const now = new Date(Date.now() - offsetMs);
        const st = ParseRelativeTimeExpr(selectedRange.rangeStart, now, offsetMs);
        const et = ParseRelativeTimeExpr(selectedRange.rangeEnd, now, offsetMs);

        return {
            rangeStartMs: st.getTime(),
            rangeEndMs: et.getTime(),
            rangeStartStr: selectedRange.rangeStart,
            rangeEndStr: selectedRange.rangeEnd,
        };
    }, [selectedRange, dayOffsetSeconds]);

    useLayoutEffect(() => {
        switch (preview.type) {
            case 'macros': {
                const selectedMacros = preview.visibleMacros ?? [];
                if (selectedMacros.length === 0) {
                    setChartData(EMPTY_CHART_DATA);
                    return;
                }

                const macroColors = selectedMacros.map((m) => MACRO_COLORS[m]);

                if (preview.useNetwork) {
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
                const selectedTags = preview.selectedTags ?? [];
                if (selectedTags.length === 0) {
                    setChartData(EMPTY_CHART_DATA);
                    return;
                }

                const colors = selectedTags.map((_, i) => TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length]);

                if (preview.useNetwork) {
                    BuildTimeChartDataNetwork(rangeStartStr, rangeEndStr, groupBy, aggregationFunc, selectedTags, colors).then(
                        setChartData
                    );
                } else {
                    setChartData(
                        BuildTimeChartData(timespans, rangeStartMs, rangeEndMs, groupBy, aggregationFunc, selectedTags, colors)
                    );
                }

                break;
            }
            case 'eventlogs': {
                const selectedEventLogs = preview.visibleEventLogs ?? [];
                if (selectedEventLogs.length === 0) {
                    setChartData(EMPTY_CHART_DATA);
                    return;
                }

                const eventLogColors = selectedEventLogs.map((m) => EVENTLOG_COLORS[m]);

                if (preview.useNetwork) {
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
                const selectedMetrics = preview.selectedMetrics ?? [];
                if (selectedMetrics.length === 0) {
                    setChartData(EMPTY_CHART_DATA);
                    return;
                }

                const colors = selectedMetrics.map((_, i) => TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length]);

                if (preview.useNetwork) {
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
        preview.type,
        preview.useNetwork,
        preview.selectedTags,
        preview.selectedMetrics,
        preview.visibleMacros,
        preview.visibleEventLogs,
        aggregationFunc,
        groupBy,
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

    const timeUnit = TIME_UNITS[live.timeUnit ?? 'hours'];

    // Units and time scaling are render-only, so they apply without a refresh.
    const displayData = useMemo((): ChartData => {
        switch (preview.type) {
            case 'macros':
                return {...chartData, units: chartData.labels.map((l) => MACRO_UNITS[l as MacroType] ?? '')};
            case 'eventlogs':
                return {...chartData, units: chartData.labels.map((l) => EVENTLOG_UNITS[l as EventLogType] ?? '')};
            case 'bodylog': {
                const unitByName = new Map(bodyMetrics.map((m) => [m.name, m.unit]));
                return {...chartData, units: chartData.labels.map((l) => unitByName.get(l) ?? '')};
            }
            case 'time': {
                const rows =
                    timeUnit.scale === 1
                        ? chartData.rows
                        : chartData.rows.map((r) => ({x: r.x, y: r.y.map((v) => v * timeUnit.scale)}));
                return {...chartData, rows, units: chartData.labels.map(() => timeUnit.abbr)};
            }
        }
    }, [chartData, preview.type, bodyMetrics, timeUnit]);

    useLayoutEffect(() => {
        // used so that charts update their size when css editing styles change it.
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
    }, [editing]);

    const scrollToSelf = () => {
        requestAnimationFrame(() => {
            thisRef.current?.scrollIntoView({
                block: 'center',
                behavior: 'instant',
            });
        });
    };

    const handleMoveUP = () => {
        onMoveUp();
        scrollToSelf();
    };

    const handleMoveDown = () => {
        onMoveDown();
        scrollToSelf();
    };

    const handleCurTimeRangeChange = (c: number) => {
        setGroupByOverride(null);
        if (draft) {
            setDraft({...draft, curTimeRange: c});
            return;
        }
        setViewTimeRange(c);
    };

    // The chart's group-by control edits the selected range, since that's where
    // groupBy lives. Applied to the preview snapshot as well as the draft, because
    // the chart has already redrawn with it and shouldn't ask to be refreshed.
    const handleGroupByChange = (g: GroupBy) => {
        if (!draft) {
            setGroupByOverride(g);
            return;
        }

        const withGroupBy = (c: DashboardCard): DashboardCard => {
            const ranges = c.timeRanges && c.timeRanges.length > 0 ? c.timeRanges : CommonRanges;
            const idx = Math.max(0, Math.min(curTimeRange, ranges.length - 1));
            return {...c, timeRanges: ranges.map((r, i) => (i === idx ? {...r, groupBy: g} : r))};
        };

        setDraft(withGroupBy(draft));
        setPreviewCard((cur) => withGroupBy(cur));
        setGroupByOverride(null);
    };

    const handleGraphStyleChange = (s: GraphStyle) => {
        if (draft) {
            setDraft({...draft, graphStyle: s});
            return;
        }
        setGraphStyleOverride(s);
    };

    const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(card);

    useEffect(() => {
        // Mount-only clicking Edit on an existing chart re-renders it rather than remounting it.
        // This is only read once at mount time.
        if (!editing) {
            return;
        }

        requestAnimationFrame(() => {
            thisRef.current?.scrollIntoView({block: 'start', behavior: 'smooth'});
        });
    }, []);

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
        groupBy,
        onGroupByChange: handleGroupByChange,
        hiddenLabels,
        onHiddenLabelsChange: setHiddenLabels,
        hideZeroValues: live.hideZeroValues,
        hideValueLabels: live.hideValueLabels,
        showYAxis: live.showYAxis,
    };

    const renderChart = () => {
        const precision = preview.type === 'time' ? timeUnit.precision : undefined;
        const formatValue = preview.type === 'time' ? timeUnit.format : undefined;

        if (MULTI_SERIES_TYPES.includes(preview.type) || graphStyle !== 'line') {
            return (
                <MultiSeriesGraph2
                    data={displayData}
                    precision={precision}
                    formatValue={formatValue}
                    graphStyle={graphStyle}
                    onGraphStyleChange={handleGraphStyleChange}
                    {...baseGraphProps}
                />
            );
        }

        return (
            <LineSingleGraph2
                data={displayData}
                precision={precision}
                formatValue={formatValue}
                graphStyle={graphStyle}
                onGraphStyleChange={handleGraphStyleChange}
                {...baseGraphProps}
            />
        );
    };

    return (
        <div ref={thisRef} className="surface-1 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="mb-0 wsnw overflow-hidden text-ellipsis">{draft?.title ?? card.title}</h2>
                {!editing && (
                    <DropdownButton
                        actions={[
                            {label: 'Edit', onClick: onStartEdit},
                            {label: 'Duplicate', onClick: onDuplicate},
                            {label: 'Move Up', disabled: isFirst, onClick: handleMoveUP},
                            {label: 'Move Down', disabled: isLast, onClick: handleMoveDown},
                            {label: 'Delete', dangerous: true, onClick: onRemove},
                        ]}
                    />
                )}
            </div>

            {editing && draft !== null && (
                <DashboardCardEditor
                    draft={draft}
                    onDraftChange={setDraft}
                    dayOffsetSeconds={dayOffsetSeconds}
                    bodyMetrics={bodyMetrics}
                    namespaces={namespaces}
                    setNamespaces={setNamespaces}
                    tagColors={tagColors}
                    isDirty={isDirty}
                    saving={saving}
                    saveError={saveError}
                    onSave={() => onSave(draft)}
                    onCancel={onCancelEdit}
                />
            )}

            <div className="relative">
                <div
                    className={`transition-opacity ${previewStale ? 'opacity-40 pointer-events-none no-drag' : ''}`}
                    aria-disabled={previewStale || undefined}
                >
                    {renderChart()}
                </div>

                {previewStale && draft !== null && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button
                            className="btn-secondary wsnw shadow-lg"
                            onClick={() => setPreviewCard(draft)}
                            title="Redraw the chart using the current settings"
                        >
                            Refresh Chart
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
