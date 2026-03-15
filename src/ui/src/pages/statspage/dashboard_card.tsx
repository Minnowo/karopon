import {Dispatch, StateUpdater, useMemo, useRef, useState} from 'preact/hooks';
import {TaggedTimespan, TblUserBodyLog, UserEventFoodLog} from '../../api/types';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {DAY_IN_MS, StartOfRangeMs} from '../../utils/time';
import {
    BpPoint,
    ChartPoint,
    DashboardCard,
    GraphDisplay,
    MacroPoint,
    MacroTotals,
    MacroType,
    MacroTypeKeys,
    RangeType,
} from './common';
import {PieChart} from './pie_chart';
import {RenderGraph} from './single_line_graph';
import {RenderGenericMultiLineGraph, MultiLinePoint} from './multi_line_graph';
import {SplitTag, TagToString} from '../../utils/tags';
import {TagInput} from '../../components/tag_input';

const MACRO_COLORS: Record<MacroType, string> = {
    fat: 'var(--color-c-flamingo)',
    carbs: 'var(--color-c-yellow)',
    fibre: 'var(--color-c-sapphire)',
    protein: 'var(--color-c-green)',
};
const MACRO_LABELS: Record<MacroType, string> = {
    fat: 'FAT',
    carbs: 'CARBS',
    fibre: 'FIBRE',
    protein: 'PROTEIN',
};

const BP_KEYS = ['systolic', 'diastolic'] as const;
type BpKey = (typeof BP_KEYS)[number];
const BP_COLORS: Record<BpKey, string> = {
    systolic: 'var(--color-c-red)',
    diastolic: 'var(--color-c-pink)',
};
const BP_LABELS: Record<BpKey, string> = {
    systolic: 'Systolic',
    diastolic: 'Diastolic',
};

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

const buildTimeChartData = (
    dayOffsetSeconds: number,
    spans: TaggedTimespan[],
    selectedTags: string[],
    display: GraphDisplay
): Array<MultiLinePoint<string>> => {
    if (selectedTags.length === 0) {
        return [];
    }
    const selectedSet = new Set(selectedTags);
    const buckets = new Map<number, Map<string, {n: number; total: number}>>();
    const nowMs = Date.now();
    const startMs =
        display.range === '24 hours'
            ? nowMs - DAY_IN_MS
            : StartOfRangeMs(nowMs, dayOffsetSeconds, display.range === '7 days' ? 7 : 28);

    for (const {timespan, tags} of spans) {
        if (timespan.stop_time <= timespan.start_time) {
            continue;
        }
        if (timespan.start_time < startMs) {
            continue;
        }
        const durationHours = (timespan.stop_time - timespan.start_time) / 3_600_000;

        let bucketKey = 0;
        switch (display.range) {
            case '24 hours': {
                const d = new Date(timespan.start_time);
                bucketKey = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
                break;
            }
            case '7 days':
            case '28 days': {
                const d = new Date(timespan.start_time - dayOffsetSeconds * 1000);
                bucketKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
            }
        }

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, new Map());
        }
        const bucket = buckets.get(bucketKey)!;

        for (const t of tags) {
            const k = TagToString(t);
            if (!selectedSet.has(k)) {
                continue;
            }
            if (!bucket.has(k)) {
                bucket.set(k, {n: 0, total: 0});
            }
            const entry = bucket.get(k)!;
            entry.n++;
            entry.total += durationHours;
        }
    }

    return Array.from(buckets.entries(), ([date, tagMap]) => {
        const point = {date} as MultiLinePoint<string>;
        for (const t of selectedTags) {
            const entry = tagMap.get(t);
            point[t] = entry ? (display.group === 'average' ? entry.total / entry.n : entry.total) : 0;
        }
        return point;
    }).sort((a, b) => a.date - b.date);
};

const buildTodayMacros = (dayOffsetSeconds: number, rows: UserEventFoodLog[], range: RangeType): MacroTotals => {
    const totals: MacroTotals = {carbs: 0, protein: 0, fat: 0, fibre: 0};
    const nowMs = Date.now();
    const startMs =
        range === '24 hours' ? nowMs - DAY_IN_MS : StartOfRangeMs(nowMs, dayOffsetSeconds, range === '7 days' ? 7 : 28);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.eventlog.user_time < startMs) {
            continue;
        }
        totals.carbs += row.total_carb;
        totals.protein += row.total_protein;
        totals.fat += row.total_fat;
        totals.fibre += row.total_fibre;
    }
    totals.carbs -= totals.fibre;
    return totals;
};

const buildMacroChartData = (dayOffsetSeconds: number, rows: UserEventFoodLog[], display: GraphDisplay): MacroPoint[] => {
    const buckets = new Map<number, {n: number; point: MacroPoint}>();
    const nowMs = Date.now();
    const startMs =
        display.range === '24 hours'
            ? nowMs - DAY_IN_MS
            : StartOfRangeMs(nowMs, dayOffsetSeconds, display.range === '7 days' ? 7 : 28);
    for (let i = 0; i < rows.length; i++) {
        const event = rows[i];
        if (event.eventlog.user_time < startMs) {
            continue;
        }
        let key = 0;
        switch (display.range) {
            case '24 hours': {
                const d = new Date(event.eventlog.user_time);
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
                break;
            }
            case '7 days':
            case '28 days': {
                const d = new Date(event.eventlog.user_time - dayOffsetSeconds * 1000);
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
            }
        }
        let obj = buckets.get(key);
        if (obj === undefined) {
            obj = {n: 0, point: {date: key, carbs: 0, protein: 0, fat: 0, fibre: 0}};
            buckets.set(key, obj);
        }
        obj.point.carbs += event.total_carb - event.total_fibre;
        obj.point.protein += event.total_protein;
        obj.point.fat += event.total_fat;
        obj.point.fibre += event.total_fibre;
        obj.n++;
    }
    return Array.from(buckets.values(), (x) => {
        if (display.group === 'average') {
            x.point.carbs /= x.n;
            x.point.protein /= x.n;
            x.point.fat /= x.n;
            x.point.fibre /= x.n;
        }
        return x.point;
    }).sort((a, b) => a.date - b.date);
};

const buildChartData = (
    dayOffsetSeconds: number,
    events: UserEventFoodLog[],
    keyGetter: (e: UserEventFoodLog) => number,
    display: GraphDisplay
): ChartPoint[] => {
    const grouped = new Map<number, {n: number; v: number}>();
    const nowMs = Date.now();
    const startMs =
        display.range === '24 hours'
            ? nowMs - DAY_IN_MS
            : StartOfRangeMs(nowMs, dayOffsetSeconds, display.range === '7 days' ? 7 : 28);
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.eventlog.user_time < startMs) {
            continue;
        }
        let key = 0;
        switch (display.range) {
            case '24 hours': {
                const d = new Date(event.eventlog.user_time);
                key = d.getTime();
                break;
            }
            case '7 days':
            case '28 days': {
                const d = new Date(event.eventlog.user_time - dayOffsetSeconds * 1000);
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
            }
        }
        let obj = grouped.get(key);
        if (obj === undefined) {
            obj = {n: 0, v: 0};
            grouped.set(key, obj);
        }
        obj.n++;
        obj.v += keyGetter(event);
    }
    return Array.from(grouped.entries(), ([key, val]) => {
        if (display.group === 'average') {
            val.v /= val.n;
        }
        return {date: key, value: val.v};
    }).sort((a, b) => a.date - b.date);
};

const buildBodyLogChartData = (
    dayOffsetSeconds: number,
    logs: TblUserBodyLog[],
    keyGetter: (log: TblUserBodyLog) => number,
    display: GraphDisplay
): ChartPoint[] => {
    const grouped = new Map<number, {n: number; v: number}>();
    const nowMs = Date.now();
    const startMs =
        display.range === '24 hours'
            ? nowMs - DAY_IN_MS
            : StartOfRangeMs(nowMs, dayOffsetSeconds, display.range === '7 days' ? 7 : 28);

    for (const log of logs) {
        if (log.user_time < startMs) {
            continue;
        }
        const val = keyGetter(log);
        if (val === 0) {
            continue;
        }

        let key = 0;
        switch (display.range) {
            case '24 hours':
                key = log.user_time;
                break;
            case '7 days':
            case '28 days': {
                const d = new Date(log.user_time - dayOffsetSeconds * 1000);
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
            }
        }

        let obj = grouped.get(key);
        if (obj === undefined) {
            obj = {n: 0, v: 0};
            grouped.set(key, obj);
        }
        obj.n++;
        obj.v += val;
    }

    return Array.from(grouped.entries(), ([key, val]) => {
        if (display.group === 'average') {
            val.v /= val.n;
        }
        return {date: key, value: val.v};
    }).sort((a, b) => a.date - b.date);
};

const buildBpChartData = (dayOffsetSeconds: number, logs: TblUserBodyLog[], display: GraphDisplay): BpPoint[] => {
    const grouped = new Map<number, {n: number; sys: number; dia: number}>();
    const nowMs = Date.now();
    const startMs =
        display.range === '24 hours'
            ? nowMs - DAY_IN_MS
            : StartOfRangeMs(nowMs, dayOffsetSeconds, display.range === '7 days' ? 7 : 28);

    for (const log of logs) {
        if (log.user_time < startMs) {
            continue;
        }
        if (log.bp_systolic === 0 && log.bp_diastolic === 0) {
            continue;
        }

        let key = 0;
        switch (display.range) {
            case '24 hours':
                key = log.user_time;
                break;
            case '7 days':
            case '28 days': {
                const d = new Date(log.user_time - dayOffsetSeconds * 1000);
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
            }
        }

        let obj = grouped.get(key);
        if (obj === undefined) {
            obj = {n: 0, sys: 0, dia: 0};
            grouped.set(key, obj);
        }
        obj.n++;
        obj.sys += log.bp_systolic;
        obj.dia += log.bp_diastolic;
    }

    return Array.from(grouped.entries(), ([key, val]) => {
        const n = display.group === 'average' ? val.n : 1;
        return {date: key, systolic: val.sys / n, diastolic: val.dia / n};
    }).sort((a, b) => a.date - b.date);
};

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
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
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
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
}: DashboardCardProps) {
    const thisRef = useRef<HTMLDivElement>(null);
    const [display, setDisplay] = useState<GraphDisplay>(card.display);
    const [visibleMacros, setVisibleMacros] = useState<MacroType[]>(
        card.visibleMacros.length > 0 ? card.visibleMacros : ['fat', 'carbs', 'fibre', 'protein']
    );
    const [visibleBpKeys, setVisibleBpKeys] = useState<BpKey[]>(['systolic', 'diastolic']);
    const [visibleTimeTags, setVisibleTimeTags] = useState<string[]>(card.selectedTags ?? []);

    const timeData = useMemo(
        () =>
            card.type === 'time' && card.selectedTags?.length > 0
                ? buildTimeChartData(dayOffsetSeconds, timespans, card.selectedTags, display)
                : [],
        [card.type, card.selectedTags, dayOffsetSeconds, timespans, display]
    );

    const macros = useMemo(
        () =>
            card.type === 'pie'
                ? buildTodayMacros(dayOffsetSeconds, eventlogs, display.range)
                : {carbs: 0, protein: 0, fat: 0, fibre: 0},
        [card.type, dayOffsetSeconds, eventlogs, display.range]
    );

    const macroData = useMemo(
        () => (card.type === 'macros' ? buildMacroChartData(dayOffsetSeconds, eventlogs, display) : []),
        [card.type, dayOffsetSeconds, eventlogs, display]
    );

    const calorieData = useMemo(
        () =>
            card.type === 'calories'
                ? buildChartData(
                      dayOffsetSeconds,
                      eventlogs,
                      (e) =>
                          CalculateCalories(
                              e.total_protein,
                              e.total_carb - e.total_fibre,
                              e.total_fibre,
                              e.total_fat,
                              Str2CalorieFormula(caloricCalcMethod)
                          ),
                      display
                  )
                : [],
        [card.type, dayOffsetSeconds, eventlogs, caloricCalcMethod, display]
    );

    const bloodData = useMemo(
        () =>
            card.type === 'blood_glucose'
                ? buildChartData(dayOffsetSeconds, eventlogs, (e) => e.eventlog.blood_glucose, display)
                : [],
        [card.type, dayOffsetSeconds, eventlogs, display]
    );

    const insulinData = useMemo(
        () =>
            card.type === 'insulin'
                ? buildChartData(dayOffsetSeconds, eventlogs, (e) => e.eventlog.actual_insulin_taken, display)
                : [],
        [card.type, dayOffsetSeconds, eventlogs, display]
    );

    const weightData = useMemo(
        () => (card.type === 'body_weight' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.weight_kg, display) : []),
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const heightData = useMemo(
        () => (card.type === 'body_height' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.height_cm, display) : []),
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const bodyFatData = useMemo(
        () =>
            card.type === 'body_fat' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.body_fat_percent, display) : [],
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const bmiData = useMemo(
        () => (card.type === 'body_bmi' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.bmi, display) : []),
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const bpSysData = useMemo(
        () =>
            card.type === 'bp_systolic' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.bp_systolic, display) : [],
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const bpDiaData = useMemo(
        () =>
            card.type === 'bp_diastolic' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.bp_diastolic, display) : [],
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const heartRateData = useMemo(
        () =>
            card.type === 'heart_rate' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.heart_rate_bpm, display) : [],
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const stepsData = useMemo(
        () => (card.type === 'steps' ? buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.steps_count, display) : []),
        [card.type, dayOffsetSeconds, bodylogs, display]
    );
    const bpCombinedData = useMemo(
        () => (card.type === 'bp_combined' ? buildBpChartData(dayOffsetSeconds, bodylogs, display) : []),
        [card.type, dayOffsetSeconds, bodylogs, display]
    );

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

    const handleDisplayChange = (d: GraphDisplay) => {
        setDisplay(d);
        onUpdate({...card, display: d});
    };

    const handleVisibleMacrosChange = (m: MacroType[]) => {
        setVisibleMacros(m);
        onUpdate({...card, visibleMacros: m});
    };

    const renderChart = () => {
        switch (card.type) {
            case 'pie':
                return (
                    <PieChart
                        title={card.title}
                        data={macros}
                        size={250}
                        range={display.range}
                        setRange={(r) => handleDisplayChange({...display, range: r})}
                    />
                );
            case 'macros':
                return RenderGenericMultiLineGraph(
                    macroData,
                    MacroTypeKeys,
                    MACRO_COLORS,
                    MACRO_LABELS,
                    display,
                    card.title,
                    visibleMacros,
                    handleVisibleMacrosChange,
                    handleDisplayChange
                );
            case 'calories':
                return RenderGraph(calorieData, display, 'value', card.title, 'var(--color-c-yellow)', handleDisplayChange, 0);
            case 'blood_glucose':
                return RenderGraph(bloodData, display, 'value', card.title, 'var(--color-c-sky)', handleDisplayChange);
            case 'insulin':
                return RenderGraph(insulinData, display, 'value', card.title, 'var(--color-c-green)', handleDisplayChange);
            case 'body_weight':
                return RenderGraph(weightData, display, 'value', card.title, 'var(--color-c-peach)', handleDisplayChange);
            case 'body_height':
                return RenderGraph(heightData, display, 'value', card.title, 'var(--color-c-lavender)', handleDisplayChange);
            case 'body_fat':
                return RenderGraph(bodyFatData, display, 'value', card.title, 'var(--color-c-flamingo)', handleDisplayChange);
            case 'body_bmi':
                return RenderGraph(bmiData, display, 'value', card.title, 'var(--color-c-mauve)', handleDisplayChange);
            case 'bp_systolic':
                return RenderGraph(bpSysData, display, 'value', card.title, 'var(--color-c-red)', handleDisplayChange);
            case 'bp_diastolic':
                return RenderGraph(bpDiaData, display, 'value', card.title, 'var(--color-c-pink)', handleDisplayChange);
            case 'bp_combined':
                return RenderGenericMultiLineGraph(
                    bpCombinedData,
                    BP_KEYS,
                    BP_COLORS,
                    BP_LABELS,
                    display,
                    card.title,
                    visibleBpKeys,
                    setVisibleBpKeys,
                    handleDisplayChange
                );
            case 'heart_rate':
                return RenderGraph(heartRateData, display, 'value', card.title, 'var(--color-c-red)', handleDisplayChange);
            case 'steps':
                return RenderGraph(stepsData, display, 'value', card.title, 'var(--color-c-teal)', handleDisplayChange, 0);
            case 'time': {
                const selectedTags = card.selectedTags ?? [];
                const tagColors: Record<string, string> = Object.fromEntries(
                    selectedTags.map((t, i) => [t, TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length]])
                );
                const tagLabels: Record<string, string> = Object.fromEntries(selectedTags.map((t) => [t, t]));
                return RenderGenericMultiLineGraph(
                    timeData,
                    selectedTags,
                    tagColors,
                    tagLabels,
                    display,
                    card.title,
                    visibleTimeTags,
                    setVisibleTimeTags,
                    handleDisplayChange,
                    2
                );
            }
        }
    };

    return (
        <div ref={thisRef}>
            {editing && (
                <div className="flex flex-col gap-2">

                <div className="flex flex-row items-center gap-2">

                    <div className="flex gap-2 shrink-0">
                        <button
                            className="px-2 py-1 border rounded text-c-text disabled:opacity-30"
                            onClick={handleMoveUP}
                            disabled={isFirst}
                        >
                            ↑
                        </button>
                        <button
                            className="px-2 py-1 border rounded text-c-text disabled:opacity-30"
                            onClick={handleMoveDown}
                            disabled={isLast}
                        >
                            ↓
                        </button>
                    </div>
                    <input
                        className="min-w-0 flex-1 px-2 py-1 border rounded bg-transparent text-c-text"
                        value={card.title}
                        onInput={(e) => onUpdate({...card, title: (e.target as HTMLInputElement).value})}
                    />
                    <button className="shrink-0 px-2 py-1 border rounded text-c-red" onClick={onRemove}>
                        ✕ Remove
                    </button>
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
