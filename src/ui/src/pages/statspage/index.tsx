import {BaseState} from '../../state/basestate';
import {useEffect, useState} from 'preact/hooks';
import {UserEventFoodLog} from '../../api/types';

import {RenderGraph} from './single_line_graph';
import {RenderMultiLineGraph} from './multi_line_graph';
import {PieChart} from './pie_chart';
import {ChartPoint, MacroPoint, MacroTotals, MacroType, RangeType} from './common';

import {Within24Hour, WithinMonth, WithinWeek} from '../../utils/time';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';

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
        let key = 0;
        switch (range) {
            case '24 hours':
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
                break;
            case '7 days':
            case '28 days':
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                break;
        }
        if (!buckets[key]) {
            buckets[key] = {date: key, carbs: 0, protein: 0, fat: 0, fibre: 0};
        }
        buckets[key].carbs += event.total_carb - event.total_fibre;
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

        let key = 0;
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
    const [calorieRange, setCalorieRange] = useState<RangeType>('24 hours');
    const [insulinRange, setInsulinRange] = useState<RangeType>('24 hours');
    const [pieChartRange, setPieChartRange] = useState<RangeType>('24 hours');

    const [macroData, setMacroData] = useState<MacroPoint[]>([]);
    const [calorieData, setCalorieData] = useState<ChartPoint[]>([]);
    const [bloodData, setBloodData] = useState<ChartPoint[]>([]);
    const [insulinData, setInsulinData] = useState<ChartPoint[]>([]);
    const [macros, setMacros] = useState<MacroTotals>({carbs: 0, protein: 0, fat: 0, fibre: 0} as MacroTotals);

    const [visibleMacros, setVisibleMacros] = useState<MacroType[]>(['carbs', 'protein', 'fat', 'fibre']);

    useEffect(() => {
        setMacroData(buildMacroChartData(state.eventlogs, carbRange));
    }, [state.eventlogs, carbRange]);

    useEffect(
        () =>
            setCalorieData(
                buildChartData(
                    state.eventlogs,
                    (e) =>
                        CalculateCalories(
                            e.total_protein,
                            e.total_carb - e.total_fibre,
                            e.total_fibre,
                            e.total_fat,
                            Str2CalorieFormula(state.user.caloric_calc_method)
                        ),
                    calorieRange
                )
            ),
        [state.user.caloric_calc_method, state.eventlogs, calorieRange]
    );
    useEffect(
        () => setBloodData(buildChartData(state.eventlogs, (e) => e.eventlog.blood_glucose, bloodRange)),
        [state.eventlogs, bloodRange]
    );
    useEffect(
        () => setInsulinData(buildChartData(state.eventlogs, (e) => e.eventlog.actual_insulin_taken, insulinRange)),
        [state.eventlogs, insulinRange]
    );

    useEffect(() => setMacros(buildTodayMacros(state.eventlogs, pieChartRange)), [state.eventlogs, pieChartRange]);

    return (
        <>
            <PieChart title="Macronutrient Totals" data={macros} size={250} range={pieChartRange} setRange={setPieChartRange} />

            {RenderMultiLineGraph(
                macroData,
                carbRange,
                'Macronutrients Consumed (g)',
                visibleMacros,
                setVisibleMacros,
                setCarbRange
            )}

            {RenderGraph(calorieData, calorieRange, 'value', 'Calories (kcal)', 'yellow', setCalorieRange)}

            {state.user.show_diabetes &&
                RenderGraph(bloodData, bloodRange, 'value', 'Blood Glucose (mmol/L)', 'lightblue', setBloodRange)}

            {state.user.show_diabetes &&
                RenderGraph(insulinData, insulinRange, 'value', 'Insulin Taken (mL)', 'green', setInsulinRange)}
        </>
    );
}
