import {BaseState} from '../../state/basestate';
import {useEffect, useState} from 'preact/hooks';
import {UserEventFoodLog} from '../../api/types';

import {RenderGraph} from './single_line_graph';
import {RenderMultiLineGraph} from './multi_line_graph';
import {PieChart} from './pie_chart';
import {ChartPoint, MacroPoint, MacroTotals, RangeType} from './common';

import {Within24Hour, WithinMonth, WithinWeek} from '../../utils/time';

const buildTodayMacros = (rows: UserEventFoodLog[], range: RangeType): MacroTotals => {
    const nowMs = new Date().getTime();
    const totals: MacroTotals = {carbs: 0, protein: 0, fat: 0, fibre: 0};
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        switch (range) {
            case '24 hours':
                if (!Within24Hour(nowMs, row.eventlog.user_time)) {
                    continue;
                }
                break;
            case '7 days':
                if (!WithinWeek(nowMs, row.eventlog.user_time)) {
                    continue;
                }
                break;
            case '28 days':
                if (!WithinMonth(nowMs, row.eventlog.user_time)) {
                    continue;
                }
                break;
        }

        totals.carbs += row.total_carb;
        totals.protein += row.total_protein;
        totals.fat += row.total_fat;
        totals.fibre += row.total_fibre;
    }
    return totals;
};

const buildMacroChartData = (rows: UserEventFoodLog[], range: RangeType): MacroPoint[] => {
    const nowMs = new Date().getTime();
    const buckets: Record<string, MacroPoint> = {};
    for (let i = 0; i < rows.length; i++) {
        const event = rows[i];

        switch (range) {
            case '24 hours':
                if (!Within24Hour(nowMs, event.eventlog.user_time)) {
                    continue;
                }
                break;
            case '7 days':
                if (!WithinWeek(nowMs, event.eventlog.user_time)) {
                    continue;
                }
                break;
            case '28 days':
                if (!WithinMonth(nowMs, event.eventlog.user_time)) {
                    continue;
                }
                break;
        }

        const d = new Date(event.eventlog.user_time);
        let key: number = 0;
        switch (range) {
            case '24 hours':
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
                break;
            case '7 days':
            case '28 days':
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
        }
        if (!buckets[key]) buckets[key] = {date: key, carbs: 0, protein: 0, fat: 0, fibre: 0};
        buckets[key].carbs += event.total_carb;
        buckets[key].protein += event.total_protein;
        buckets[key].fat += event.total_fat;
        buckets[key].fibre += event.total_fibre;
    }
    return Object.values(buckets).sort((a, b) => a.date - b.date);
};

const buildChartData = (
    events: UserEventFoodLog[],
    keyGetter: (e: UserEventFoodLog) => number,
    range: RangeType
): ChartPoint[] => {
    const nowMs = new Date().getTime();
    const grouped = new Map<number, number>();

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const d = new Date(event.eventlog.user_time);
        switch (range) {
            case '24 hours':
                if (!Within24Hour(nowMs, event.eventlog.user_time)) {
                    continue;
                }
                break;
            case '7 days':
                if (!WithinWeek(nowMs, event.eventlog.user_time)) {
                    continue;
                }
                break;
            case '28 days':
                if (!WithinMonth(nowMs, event.eventlog.user_time)) {
                    continue;
                }
                break;
        }

        let key: number = 0;
        switch (range) {
            case '24 hours':
                key = d.getTime();
                break;
            case '7 days':
            case '28 days':
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
        }

        grouped.set(key, (grouped.get(key) || 0) + keyGetter(event));
    }

    return Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([date, val]) => ({date, value: val}));
};

export function StatsPage(state: BaseState) {
    const [carbRange, setCarbRange] = useState<RangeType>('24 hours');
    const [bloodRange, setBloodRange] = useState<RangeType>('24 hours');
    const [insulinRange, setInsulinRange] = useState<RangeType>('24 hours');
    const [pieChartRange, setPieChartRange] = useState<RangeType>('24 hours');

    const [macroData, setMacroData] = useState<MacroPoint[]>([]);
    const [bloodData, setBloodData] = useState<ChartPoint[]>([]);
    const [insulinData, setInsulinData] = useState<ChartPoint[]>([]);
    const [macros, setMacros] = useState<MacroTotals | null>(null);

    const [visibleMacros, setVisibleMacros] = useState<string[]>(['carbs', 'protein', 'fat', 'fibre']);

    useEffect(() => {
        setMacroData(buildMacroChartData(state.eventlogs, carbRange));
    }, [state.eventlogs, carbRange]);

    useEffect(
        () => setBloodData(buildChartData(state.eventlogs, (e) => e.eventlog.blood_glucose, bloodRange)),
        [state.eventlogs, bloodRange]
    );
    useEffect(
        () => setInsulinData(buildChartData(state.eventlogs, (e) => e.eventlog.actual_insulin_taken, insulinRange)),
        [state.eventlogs, insulinRange]
    );

    useEffect(() => {
        if (state.eventlogs.length) setMacros(buildTodayMacros(state.eventlogs, pieChartRange));
    }, [state.eventlogs, pieChartRange]);

    return (
        <>
            <h1 className="text-3xl mb-6">Stats Summary</h1>

            {macros && (
                <div className="mb-8">
                    <h2 className="text-2xl mb-4">Today's Nutrition Breakdown</h2>
                    {macros.carbs + macros.protein + macros.fat + macros.fibre === 0 ? (
                        <div className="p-4 text-center text-yellow-400">
                            Please enter a meal today to see your daily nutrient information
                        </div>
                    ) : (
                        <PieChart data={macros} size={250} range={pieChartRange} setRange={setPieChartRange} />
                    )}
                </div>
            )}

            {RenderMultiLineGraph(
                macroData,
                carbRange,
                'Macronutrients Consumed (g)',
                visibleMacros,
                setVisibleMacros,
                setCarbRange,
                carbRange
            )}

            {RenderGraph(bloodData, bloodRange, 'value', 'Blood Glucose (mmol/L)', 'lightblue', setBloodRange, bloodRange)}

            {RenderGraph(insulinData, insulinRange, 'value', 'Insulin Taken (mL)', 'green', setInsulinRange, insulinRange)}
        </>
    );
}
