import {useMemo, useState} from 'preact/hooks';
import {UserEventFoodLog} from '../../api/types';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {DAY_IN_MS, StartOfRangeMs} from '../../utils/time';
import {ChartPoint, DashboardCard, GraphDisplay, MacroPoint, MacroTotals, MacroType, RangeType} from './common';
import {PieChart} from './pie_chart';
import {RenderMultiLineGraph} from './multi_line_graph';
import {RenderGraph} from './single_line_graph';

const buildTodayMacros = (dayOffsetSeconds: number, rows: UserEventFoodLog[], range: RangeType): MacroTotals => {
    const totals: MacroTotals = {carbs: 0, protein: 0, fat: 0, fibre: 0};
    const nowMs = Date.now();
    const startMs =
        range === '24 hours' ? nowMs - DAY_IN_MS : StartOfRangeMs(nowMs, dayOffsetSeconds, range === '7 days' ? 7 : 28);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.eventlog.user_time < startMs) continue;
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
        if (event.eventlog.user_time < startMs) continue;
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
        if (event.eventlog.user_time < startMs) continue;
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
        if (display.group === 'average') val.v /= val.n;
        return {date: key, value: val.v};
    }).sort((a, b) => a.date - b.date);
};

type DashboardCardProps = {
    card: DashboardCard;
    eventlogs: UserEventFoodLog[];
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
        }
    };

    return (
        <div>
            {editing && (
                <div className="flex items-center gap-2 mb-2">
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
                    <input
                        className="flex-1 px-2 py-1 border rounded bg-transparent text-c-text"
                        value={card.title}
                        onInput={(e) => onUpdate({...card, title: (e.target as HTMLInputElement).value})}
                    />
                    <button className="px-2 py-1 border rounded text-c-red" onClick={onRemove}>
                        ✕ Remove
                    </button>
                </div>
            )}
            {renderChart()}
        </div>
    );
}
