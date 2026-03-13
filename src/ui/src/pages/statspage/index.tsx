import {BaseState} from '../../state/basestate';
import {useEffect, useState} from 'preact/hooks';
import {UserEventFoodLog} from '../../api/types';

import {RenderGraph} from './single_line_graph';
import {RenderMultiLineGraph} from './multi_line_graph';
import {PieChart} from './pie_chart';
import {ChartPoint, GraphDisplay, MacroPoint, MacroTotals, MacroType, RangeType} from './common';

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

const buildMacroChartData = (dayOffsetSeconds: number, rows: UserEventFoodLog[], display: GraphDisplay): MacroPoint[] => {
    const nowMs = new Date().getTime();
    const buckets = new Map<number, {n: number; point: MacroPoint}>();
    for (let i = 0; i < rows.length; i++) {
        const event = rows[i];

        switch (display.range) {
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
    const nowMs = new Date().getTime();
    const grouped = new Map<number, {n: number; v: number}>();

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        switch (display.range) {
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

        return {
            date: key,
            value: val.v,
        };
    }).sort((a, b) => a.date - b.date);
};

export function StatsPage(state: BaseState) {
    const [carbRange, setCarbRange] = useState<GraphDisplay>({range: '24 hours', group: 'sum'});
    const [bloodRange, setBloodRange] = useState<GraphDisplay>({range: '24 hours', group: 'sum'});
    const [calorieRange, setCalorieRange] = useState<GraphDisplay>({range: '24 hours', group: 'sum'});
    const [insulinRange, setInsulinRange] = useState<GraphDisplay>({range: '24 hours', group: 'sum'});
    const [pieChartRange, setPieChartRange] = useState<RangeType>('24 hours');

    const [macroData, setMacroData] = useState<MacroPoint[]>([]);
    const [calorieData, setCalorieData] = useState<ChartPoint[]>([]);
    const [bloodData, setBloodData] = useState<ChartPoint[]>([]);
    const [insulinData, setInsulinData] = useState<ChartPoint[]>([]);
    const [macros, setMacros] = useState<MacroTotals>({carbs: 0, protein: 0, fat: 0, fibre: 0} as MacroTotals);

    const [visibleMacros, setVisibleMacros] = useState<MacroType[]>(['fat', 'carbs', 'fibre', 'protein']);

    useEffect(() => {
        setMacroData(buildMacroChartData(state.user.day_time_offset_seconds, state.eventlogs, carbRange));
    }, [state.user.day_time_offset_seconds, state.eventlogs, carbRange]);

    useEffect(
        () =>
            setCalorieData(
                buildChartData(
                    state.user.day_time_offset_seconds,
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
        [state.user.day_time_offset_seconds, state.user.caloric_calc_method, state.eventlogs, calorieRange]
    );
    useEffect(
        () =>
            setBloodData(
                buildChartData(state.user.day_time_offset_seconds, state.eventlogs, (e) => e.eventlog.blood_glucose, bloodRange)
            ),
        [state.user.day_time_offset_seconds, state.eventlogs, bloodRange]
    );
    useEffect(
        () =>
            setInsulinData(
                buildChartData(
                    state.user.day_time_offset_seconds,
                    state.eventlogs,
                    (e) => e.eventlog.actual_insulin_taken,
                    insulinRange
                )
            ),
        [state.user.day_time_offset_seconds, state.eventlogs, insulinRange]
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

            {RenderGraph(calorieData, calorieRange, 'value', 'Calories (kcal)', 'var(--color-c-yellow)', setCalorieRange, 0)}

            {state.user.show_diabetes &&
                RenderGraph(bloodData, bloodRange, 'value', 'Blood Glucose (mmol/L)', 'var(--color-c-sky)', setBloodRange)}

            {state.user.show_diabetes &&
                RenderGraph(insulinData, insulinRange, 'value', 'Insulin Taken (mL)', 'var(--color-c-green)', setInsulinRange)}
        </>
    );
}
