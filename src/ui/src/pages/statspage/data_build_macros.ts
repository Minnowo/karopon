import {UserEventFoodLog} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {MacronutrientPoint} from '../../api/types_stats_macros';
import {ApiGetStatsMacro} from '../../api/api';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {DateToGroupByBucket} from './data_build';
import {ChartData, DataRow, MacroType} from './common';

const NETWORK_SERIES_KEY: Record<MacroType, keyof MacronutrientPoint> = {
    fat: 'fat',
    carbs: 'carb',
    net_carbs: 'net_carb',
    fibre: 'fibre',
    protein: 'protein',
    calorie: 'calorie',
};

const seriesValue = (
    series: MacroType,
    protein: number,
    carb: number,
    netCarb: number,
    fibre: number,
    fat: number,
    calorieCalcMethod: string
): number => {
    switch (series) {
        case 'fat':
            return fat;
        case 'carbs':
            return carb;
        case 'net_carbs':
            return netCarb;
        case 'fibre':
            return fibre;
        case 'protein':
            return protein;
        case 'calorie':
            return CalculateCalories(protein, netCarb, fibre, fat, Str2CalorieFormula(calorieCalcMethod));
    }
};

export const BuildMacroChartData = (
    rows: UserEventFoodLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    calorieCalcMethod: string,
    selectedSeries: MacroType[],
    colors: string[]
): ChartData => {
    const buckets = new Map<number, {n: number; v: Float32Array}>();

    for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];

        if (row.eventlog.user_time < rangeStartMs || row.eventlog.user_time > rangeEndMs) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(row.eventlog.user_time));
        const netCarb = row.total_carb - row.total_fibre;
        const values = selectedSeries.map((s) =>
            seriesValue(s, row.total_protein, row.total_carb, netCarb, row.total_fibre, row.total_fat, calorieCalcMethod)
        );

        let entry = buckets.get(bucketKey);
        if (!entry) {
            entry = {n: 0, v: new Float32Array(selectedSeries.length)};
            buckets.set(bucketKey, entry);
        }

        switch (aggregationFunc) {
            case AggregationFunc.Sum: {
                entry.n = 1;
                values.forEach((v, i) => (entry!.v[i] += v));
                break;
            }
            case AggregationFunc.Avg: {
                entry.n++;
                values.forEach((v, i) => (entry!.v[i] += v));
                break;
            }
            case AggregationFunc.Min: {
                if (entry.n === 0) {
                    entry.n = 1;
                    values.forEach((v, i) => (entry!.v[i] = v));
                }
                values.forEach((v, i) => {
                    if (entry!.v[i] > v) {
                        entry!.v[i] = v;
                    }
                });
                break;
            }
            case AggregationFunc.Max: {
                if (entry.n === 0) {
                    entry.n = 1;
                    values.forEach((v, i) => (entry!.v[i] = v));
                }
                values.forEach((v, i) => {
                    if (entry!.v[i] < v) {
                        entry!.v[i] = v;
                    }
                });
                break;
            }
        }
    }

    const dataRows: DataRow[] = Array.from(buckets.entries(), ([x, entry]) => {
        if (aggregationFunc === AggregationFunc.Avg) {
            for (let i = 0; i < entry.v.length; i++) {
                entry.v[i] = entry.v[i] / entry.n;
            }
        }

        return {x, y: entry.v};
    }).sort((a, b) => a.x - b.x);

    return {
        labels: selectedSeries,
        colors,
        rows: dataRows,
    };
};

export const BuildMacroChartDataNetwork = (
    rangeStart: string,
    rangeEnd: string,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    selectedSeries: MacroType[],
    colors: string[]
): Promise<ChartData> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return ApiGetStatsMacro({
        start: rangeStart,
        end: rangeEnd,
        groupby: groupBy,
        aggregate: aggregationFunc,
        timezone,
    }).then((points) => {
        const dataRows: DataRow[] = points.map((p) => ({
            x: p.bucket,
            y: Float32Array.from(selectedSeries, (s) => p[NETWORK_SERIES_KEY[s]]),
        }));

        return {
            labels: selectedSeries,
            colors,
            rows: dataRows,
        };
    });
};
