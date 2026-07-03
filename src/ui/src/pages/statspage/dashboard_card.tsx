import {Dispatch, StateUpdater, useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {TaggedTimespan, TblUserBodyLog, UserEventFoodLog} from '../../api/types';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {CommonRanges, DashboardCard, GraphDisplay, GraphStyle, TimeRange} from './common';
import {PieChart} from './graphs/graph_pie_chart';
import {MultiLineGraph2} from './graphs/graph_line_multi2';
import {StackedBarGraph2} from './graphs/graph_bar_stacked2';
import {LineSingleGraph2} from './graphs/graph_line_single2';
import {SplitTag, TagToString} from '../../utils/tags';
import {TagInput} from '../../components/tag_input';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {ChartData} from './graphs/common_props';
import {BuildTimeChartData, BuildTimeChartDataNetwork} from './data_build_time';
import {BuildChartData, BuildBodyLogChartData, BuildBpChartData} from './data_build_other';
import {BuildMacroChartData} from './data_build_macros';
import {ParseRelativeTimeExpr} from './data_build';

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
    calories: 0,
    steps: 0,
    time: 2,
};

const MULTI_SERIES_TYPES: Array<DashboardCard['type']> = ['macros', 'bp_combined', 'time'];

type DashboardCardProps = {
    card: DashboardCard;
    eventlogs: UserEventFoodLog[];
    bodylogs: TblUserBodyLog[];
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
    const [display, setDisplay] = useState<GraphDisplay>(card.display);

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

    const {rangeStartMs, rangeEndMs} = useMemo(() => {
        const tr =
            timeRanges && timeRanges.length > 0 && timeRanges.length > curTimeRange ? timeRanges[curTimeRange] : CommonRanges[0];

        const offsetMs = dayOffsetSeconds / 1000;
        const now = new Date(Date.now() - offsetMs);
        const st = ParseRelativeTimeExpr(tr.rangeStart, now, offsetMs);
        const et = ParseRelativeTimeExpr(tr.rangeEnd, now, offsetMs);

        return {rangeStartMs: st.getTime(), rangeEndMs: et.getTime()};
    }, [timeRanges, curTimeRange, dayOffsetSeconds]);

    useLayoutEffect(() => {
        switch (card.type) {
            case 'macros':
            case 'pie': {
                const newData = BuildMacroChartData(eventlogs, rangeStartMs, rangeEndMs, groupBy, aggregationFunc, [
                    'var(--color-c-flamingo)',
                    'var(--color-c-yellow)',
                    'var(--color-c-sapphire)',
                    'var(--color-c-green)',
                ]);

                setChartData(newData);

                break;
            }
            case 'time': {
                if (card.selectedTags?.length <= 0) {
                    return;
                }

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

                // TODO: option to choose between local and network graph computation
                // BuildTimeChartDataNetwork(
                //     tr.rangeStart,
                //     tr.rangeEnd,
                //     groupBy,
                //     aggregationFunc,
                //     card.selectedTags,
                //     card.selectedTags.map((_, i) => TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length])
                // ).then(setChartData);

                break;
            }
            case 'calories': {
                setChartData(
                    BuildChartData(
                        eventlogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (e) =>
                            CalculateCalories(
                                e.total_protein,
                                e.total_carb - e.total_fibre,
                                e.total_fibre,
                                e.total_fat,
                                Str2CalorieFormula(caloricCalcMethod)
                            ),
                        'var(--color-c-yellow)'
                    )
                );
                break;
            }
            case 'blood_glucose': {
                setChartData(
                    BuildChartData(
                        eventlogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (e) => e.eventlog.blood_glucose,
                        'var(--color-c-sky)'
                    )
                );
                break;
            }
            case 'insulin': {
                setChartData(
                    BuildChartData(
                        eventlogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (e) => e.eventlog.actual_insulin_taken,
                        'var(--color-c-green)'
                    )
                );
                break;
            }
            case 'body_weight': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.weight_kg,
                        'var(--color-c-peach)'
                    )
                );
                break;
            }
            case 'body_height': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.height_cm,
                        'var(--color-c-lavender)'
                    )
                );
                break;
            }
            case 'body_fat': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.body_fat_percent,
                        'var(--color-c-flamingo)'
                    )
                );
                break;
            }
            case 'body_bmi': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.bmi,
                        'var(--color-c-mauve)'
                    )
                );
                break;
            }
            case 'bp_systolic': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.bp_systolic,
                        'var(--color-c-red)'
                    )
                );
                break;
            }
            case 'bp_diastolic': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.bp_diastolic,
                        'var(--color-c-pink)'
                    )
                );
                break;
            }
            case 'bp_combined': {
                setChartData(BuildBpChartData(bodylogs, rangeStartMs, rangeEndMs, groupBy, aggregationFunc));
                break;
            }
            case 'heart_rate': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.heart_rate_bpm,
                        'var(--color-c-red)'
                    )
                );
                break;
            }
            case 'steps': {
                setChartData(
                    BuildBodyLogChartData(
                        bodylogs,
                        rangeStartMs,
                        rangeEndMs,
                        groupBy,
                        aggregationFunc,
                        (l) => l.steps_count,
                        'var(--color-c-teal)'
                    )
                );
                break;
            }
        }
    }, [
        card.type,
        timeRanges,
        curTimeRange,
        aggregationFunc,
        groupBy,
        card.selectedTags,
        eventlogs,
        bodylogs,
        dayOffsetSeconds,
        rangeStartMs,
        rangeEndMs,
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
        setCurTimeRange(c);
        onUpdate({...card, curTimeRange: c});
    };

    const graphStyle: GraphStyle = card.graphStyle ?? 'line';

    const handleGraphStyleChange = (s: GraphStyle) => {
        onUpdate({...card, graphStyle: s});
    };

    const MultiSeriesGraph2 = graphStyle === 'bar' ? StackedBarGraph2 : MultiLineGraph2;

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
    };

    const renderChart = () => {
        const title = editing ? '' : card.title;

        if (card.type === 'pie') {
            return <PieChart title={title} data={chartData} size={250} {...baseGraphProps} />;
        }

        const precision = PRECISION_BY_TYPE[card.type];

        if (MULTI_SERIES_TYPES.includes(card.type)) {
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

        return <LineSingleGraph2 title={title} data={chartData} precision={precision} {...baseGraphProps} />;
    };

    return (
        <div ref={thisRef} className={`${editing ? 'flex flex-col container-theme gap-2' : ''}`}>
            {editing && (
                <div className="flex flex-col gap-2">
                    <div className="flex flex-row items-center gap-2">
                        <button className="shrink-0 px-2 py-1 delete-btn" onClick={onRemove}>
                            ✕ Remove
                        </button>
                        <input
                            className="min-w-0 flex-1 px-2 py-1"
                            value={card.title}
                            onInput={(e) => onUpdate({...card, title: (e.target as HTMLInputElement).value})}
                        />
                        <div className="flex gap-1 shrink-0">
                            <button className="px-3 py-1" onClick={handleMoveUP} disabled={isFirst}>
                                ↑
                            </button>
                            <button className="px-3 py-1" onClick={handleMoveDown} disabled={isLast}>
                                ↓
                            </button>
                        </div>
                    </div>
                    {card.type === 'time' && (
                        <>
                            <div>
                                <h2 className="text-lg font-bold">Tags</h2>
                                <TagInput
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    thisTags={card.selectedTags.map(SplitTag)}
                                    onChange={(tags) => onUpdate({...card, selectedTags: tags.map(TagToString)})}
                                    tagColors={tagColors}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
            {renderChart()}
        </div>
    );
}
