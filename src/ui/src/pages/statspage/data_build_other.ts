import {TblUserBodyLog, UserEventFoodLog} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {DateToGroupByBucket} from './data_build';
import {ChartData, DataRow} from './graphs/common_props';

export const BuildChartData = (
    events: UserEventFoodLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    keyGetter: (e: UserEventFoodLog) => number,
    color: string
): ChartData => {
    const buckets = new Map<number, {n: number; v: number}>();

    for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];
        const t = event.eventlog.user_time;

        if (t < rangeStartMs || t > rangeEndMs) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(t));
        const val = keyGetter(event);

        let entry = buckets.get(bucketKey);
        if (!entry) {
            entry = {n: 0, v: 0};
            buckets.set(bucketKey, entry);
        }

        switch (aggregationFunc) {
            case AggregationFunc.Sum: {
                entry.n = 1;
                entry.v += val;
                break;
            }
            case AggregationFunc.Avg: {
                entry.n++;
                entry.v += val;
                break;
            }
            case AggregationFunc.Min: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.v = val;
                }
                if (entry.v > val) {
                    entry.v = val;
                }
                break;
            }
            case AggregationFunc.Max: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.v = val;
                }
                if (entry.v < val) {
                    entry.v = val;
                }
                break;
            }
        }
    }

    const rows: DataRow[] = Array.from(buckets.entries(), ([x, entry]) => ({
        x,
        y: Float32Array.of(aggregationFunc === AggregationFunc.Avg ? entry.v / entry.n : entry.v),
    })).sort((a, b) => a.x - b.x);

    return {
        labels: ['value'],
        colors: [color],
        rows,
    };
};

export const BuildBodyLogChartData = (
    logs: TblUserBodyLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    keyGetter: (log: TblUserBodyLog) => number,
    color: string
): ChartData => {
    const buckets = new Map<number, {n: number; v: number}>();

    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.user_time < rangeStartMs || log.user_time > rangeEndMs) {
            continue;
        }

        const val = keyGetter(log);
        if (val === 0) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(log.user_time));

        let entry = buckets.get(bucketKey);
        if (!entry) {
            entry = {n: 0, v: 0};
            buckets.set(bucketKey, entry);
        }

        switch (aggregationFunc) {
            case AggregationFunc.Sum: {
                entry.n = 1;
                entry.v += val;
                break;
            }
            case AggregationFunc.Avg: {
                entry.n++;
                entry.v += val;
                break;
            }
            case AggregationFunc.Min: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.v = val;
                }
                if (entry.v > val) {
                    entry.v = val;
                }
                break;
            }
            case AggregationFunc.Max: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.v = val;
                }
                if (entry.v < val) {
                    entry.v = val;
                }
                break;
            }
        }
    }

    const rows: DataRow[] = Array.from(buckets.entries(), ([x, entry]) => ({
        x,
        y: Float32Array.of(aggregationFunc === AggregationFunc.Avg ? entry.v / entry.n : entry.v),
    })).sort((a, b) => a.x - b.x);

    return {
        labels: ['value'],
        colors: [color],
        rows,
    };
};

export const BuildBpChartData = (
    logs: TblUserBodyLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc
): ChartData => {
    const sys = 0;
    const dia = 1;

    const buckets = new Map<number, {n: number; y: Float32Array}>();

    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.user_time < rangeStartMs || log.user_time > rangeEndMs) {
            continue;
        }
        if (log.bp_systolic === 0 && log.bp_diastolic === 0) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(log.user_time));

        let entry = buckets.get(bucketKey);
        if (!entry) {
            entry = {n: 0, y: new Float32Array(2)};
            buckets.set(bucketKey, entry);
        }

        switch (aggregationFunc) {
            case AggregationFunc.Sum: {
                entry.n = 1;
                entry.y[sys] += log.bp_systolic;
                entry.y[dia] += log.bp_diastolic;
                break;
            }
            case AggregationFunc.Avg: {
                entry.n++;
                entry.y[sys] += log.bp_systolic;
                entry.y[dia] += log.bp_diastolic;
                break;
            }
            case AggregationFunc.Min: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.y[sys] = log.bp_systolic;
                    entry.y[dia] = log.bp_diastolic;
                }
                if (entry.y[sys] > log.bp_systolic) {
                    entry.y[sys] = log.bp_systolic;
                }
                if (entry.y[dia] > log.bp_diastolic) {
                    entry.y[dia] = log.bp_diastolic;
                }
                break;
            }
            case AggregationFunc.Max: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.y[sys] = log.bp_systolic;
                    entry.y[dia] = log.bp_diastolic;
                }
                if (entry.y[sys] < log.bp_systolic) {
                    entry.y[sys] = log.bp_systolic;
                }
                if (entry.y[dia] < log.bp_diastolic) {
                    entry.y[dia] = log.bp_diastolic;
                }
                break;
            }
        }
    }

    const rows: DataRow[] = Array.from(buckets.entries(), ([x, entry]) => {
        const y =
            aggregationFunc === AggregationFunc.Avg ? Float32Array.of(entry.y[sys] / entry.n, entry.y[dia] / entry.n) : entry.y;
        return {x, y};
    }).sort((a, b) => a.x - b.x);

    return {
        labels: ['systolic', 'diastolic'],
        colors: ['var(--color-c-red)', 'var(--color-c-pink)'],
        rows,
    };
};
