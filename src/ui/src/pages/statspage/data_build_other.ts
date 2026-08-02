import {UserBodyLog, UserEventFoodLog} from '../../api/types';
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

// valueForMetricName looks up a body log's value for the metric with the given name,
// resolved through metricNamesByID (body_metric_id -> name). Returns 0 if the log has no
// value for that metric (e.g. the user never defined it, or didn't record it that time).
const valueForMetricName = (log: UserBodyLog, metricNamesByID: Map<number, string>, name: string): number => {
    const match = log.metrics.find((m) => metricNamesByID.get(m.body_metric_id) === name);
    return match ? match.value : 0;
};

export const BuildBodyLogChartData = (
    logs: UserBodyLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    metricNamesByID: Map<number, string>,
    metricName: string,
    color: string
): ChartData => {
    const buckets = new Map<number, {n: number; v: number}>();

    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.bodylog.user_time < rangeStartMs || log.bodylog.user_time > rangeEndMs) {
            continue;
        }

        const val = valueForMetricName(log, metricNamesByID, metricName);
        if (val === 0) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(log.bodylog.user_time));

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
    logs: UserBodyLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    metricNamesByID: Map<number, string>
): ChartData => {
    const sys = 0;
    const dia = 1;

    const buckets = new Map<number, {n: number; y: Float32Array}>();

    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.bodylog.user_time < rangeStartMs || log.bodylog.user_time > rangeEndMs) {
            continue;
        }

        const bpSys = valueForMetricName(log, metricNamesByID, 'Blood Pressure Systolic');
        const bpDia = valueForMetricName(log, metricNamesByID, 'Blood Pressure Diastolic');
        if (bpSys === 0 && bpDia === 0) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(log.bodylog.user_time));

        let entry = buckets.get(bucketKey);
        if (!entry) {
            entry = {n: 0, y: new Float32Array(2)};
            buckets.set(bucketKey, entry);
        }

        switch (aggregationFunc) {
            case AggregationFunc.Sum: {
                entry.n = 1;
                entry.y[sys] += bpSys;
                entry.y[dia] += bpDia;
                break;
            }
            case AggregationFunc.Avg: {
                entry.n++;
                entry.y[sys] += bpSys;
                entry.y[dia] += bpDia;
                break;
            }
            case AggregationFunc.Min: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.y[sys] = bpSys;
                    entry.y[dia] = bpDia;
                }
                if (entry.y[sys] > bpSys) {
                    entry.y[sys] = bpSys;
                }
                if (entry.y[dia] > bpDia) {
                    entry.y[dia] = bpDia;
                }
                break;
            }
            case AggregationFunc.Max: {
                if (entry.n === 0) {
                    entry.n = 1;
                    entry.y[sys] = bpSys;
                    entry.y[dia] = bpDia;
                }
                if (entry.y[sys] < bpSys) {
                    entry.y[sys] = bpSys;
                }
                if (entry.y[dia] < bpDia) {
                    entry.y[dia] = bpDia;
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
