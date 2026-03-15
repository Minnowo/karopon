import {useMemo, useState} from 'preact/hooks';
import {TblUserBodyLog, UserEventFoodLog} from '../../api/types';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {DAY_IN_MS, StartOfRangeMs} from '../../utils/time';
import {BpPoint, ChartPoint, DashboardCard, GraphDisplay, MacroPoint, MacroTotals, MacroType, RangeType} from './common';
import {PieChart} from './pie_chart';
import {RenderMultiLineGraph} from './multi_line_graph';
import {RenderGraph} from './single_line_graph';
import {RenderBpGraph} from './bp_graph';

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
    dayOffsetSeconds: number;
    caloricCalcMethod: string;
    editing: boolean;
    isFirst: boolean;
    isLast: boolean;
    onUpdate: (card: DashboardCard) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
};

export function DashboardCardComponent({
    card,
    eventlogs,
    bodylogs,
    dayOffsetSeconds,
    caloricCalcMethod,
    editing,
    isFirst,
    isLast,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
}: DashboardCardProps) {
    const [display, setDisplay] = useState<GraphDisplay>(card.display);
    const [visibleMacros, setVisibleMacros] = useState<MacroType[]>(
        card.visibleMacros.length > 0 ? card.visibleMacros : ['fat', 'carbs', 'fibre', 'protein']
    );

    const handleDisplayChange = (d: GraphDisplay) => {
        setDisplay(d);
        onUpdate({...card, display: d});
    };

    const handleVisibleMacrosChange = (m: MacroType[]) => {
        setVisibleMacros(m);
        onUpdate({...card, visibleMacros: m});
    };

    const macros = useMemo(
        () => buildTodayMacros(dayOffsetSeconds, eventlogs, display.range),
        [dayOffsetSeconds, eventlogs, display.range]
    );

    const macroData = useMemo(
        () => buildMacroChartData(dayOffsetSeconds, eventlogs, display),
        [dayOffsetSeconds, eventlogs, display]
    );

    const calorieData = useMemo(
        () =>
            buildChartData(
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
            ),
        [dayOffsetSeconds, eventlogs, caloricCalcMethod, display]
    );

    const bloodData = useMemo(
        () => buildChartData(dayOffsetSeconds, eventlogs, (e) => e.eventlog.blood_glucose, display),
        [dayOffsetSeconds, eventlogs, display]
    );

    const insulinData = useMemo(
        () => buildChartData(dayOffsetSeconds, eventlogs, (e) => e.eventlog.actual_insulin_taken, display),
        [dayOffsetSeconds, eventlogs, display]
    );

    const weightData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.weight_kg, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const heightData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.height_cm, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const bodyFatData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.body_fat_percent, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const bmiData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.bmi, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const bpSysData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.bp_systolic, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const bpDiaData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.bp_diastolic, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const heartRateData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.heart_rate_bpm, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const stepsData = useMemo(
        () => buildBodyLogChartData(dayOffsetSeconds, bodylogs, (l) => l.steps_count, display),
        [dayOffsetSeconds, bodylogs, display]
    );
    const bpCombinedData = useMemo(
        () => buildBpChartData(dayOffsetSeconds, bodylogs, display),
        [dayOffsetSeconds, bodylogs, display]
    );

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
                return RenderMultiLineGraph(
                    macroData,
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
                return RenderBpGraph(bpCombinedData, display, card.title, handleDisplayChange);
            case 'heart_rate':
                return RenderGraph(heartRateData, display, 'value', card.title, 'var(--color-c-red)', handleDisplayChange);
            case 'steps':
                return RenderGraph(stepsData, display, 'value', card.title, 'var(--color-c-teal)', handleDisplayChange, 0);
        }
    };

    return (
        <div>
            {editing && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="flex gap-2 shrink-0">
                        <button
                            className="px-2 py-1 border rounded text-c-text disabled:opacity-30"
                            onClick={onMoveUp}
                            disabled={isFirst}
                        >
                            ↑
                        </button>
                        <button
                            className="px-2 py-1 border rounded text-c-text disabled:opacity-30"
                            onClick={onMoveDown}
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
            )}
            {renderChart()}
        </div>
    );
}
