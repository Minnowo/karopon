import {UserBodyLog, UserEventFoodLog} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {ApiGetBodyLogStatsTime} from '../../api/api';
import {DateToGroupByBucket} from './data_build';
import {ChartData, DataRow} from './common';

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

// BuildBodyLogChartData buckets and aggregates the given body logs into one series per
// selected metric name, resolved through metricNamesByID (body_metric_id -> name). Mirrors
// BuildTimeChartData's per-label bucketing, but over recorded metric values instead of tag
// durations.
export const BuildBodyLogChartData = (
    logs: UserBodyLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    metricNamesByID: Map<number, string>,
    selectedMetrics: string[],
    colors: string[]
): ChartData => {
    if (selectedMetrics.length === 0) {
        return {rows: [], labels: [], colors: []};
    }

    const selectedSet = new Set(selectedMetrics);
    const buckets = new Map<number, Map<string, {n: number; v: number}>>();

    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.bodylog.user_time < rangeStartMs || log.bodylog.user_time > rangeEndMs) {
            continue;
        }

        for (const m of log.metrics) {
            const name = metricNamesByID.get(m.body_metric_id);
            if (!name || !selectedSet.has(name)) {
                continue;
            }

            const bucketKey = DateToGroupByBucket(groupBy, new Date(log.bodylog.user_time));

            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, new Map());
            }
            const bucket = buckets.get(bucketKey)!;

            if (!bucket.has(name)) {
                bucket.set(name, {n: 0, v: 0});
            }
            const entry = bucket.get(name)!;

            switch (aggregationFunc) {
                case AggregationFunc.Sum: {
                    entry.n = 1;
                    entry.v += m.value;
                    break;
                }
                case AggregationFunc.Avg: {
                    entry.n++;
                    entry.v += m.value;
                    break;
                }
                case AggregationFunc.Min: {
                    if (entry.n === 0) {
                        entry.n = 1;
                        entry.v = m.value;
                    }
                    if (entry.v > m.value) {
                        entry.v = m.value;
                    }
                    break;
                }
                case AggregationFunc.Max: {
                    if (entry.n === 0) {
                        entry.n = 1;
                        entry.v = m.value;
                    }
                    if (entry.v < m.value) {
                        entry.v = m.value;
                    }
                    break;
                }
            }
        }
    }

    const newData: ChartData = {
        rows: [],
        labels: selectedMetrics,
        colors: selectedMetrics.map((_, i) => colors[i % colors.length]),
    };

    const labelIdx = new Map<string, number>();
    newData.labels.forEach((l, i) => labelIdx.set(l, i));

    for (const [bucketKey, metricEntries] of buckets.entries()) {
        const row: DataRow = {x: bucketKey, y: new Float32Array(selectedMetrics.length)};

        for (const [name, agg] of metricEntries.entries()) {
            const i = labelIdx.get(name)!;
            row.y[i] = aggregationFunc === AggregationFunc.Avg ? agg.v / agg.n : agg.v;
        }

        newData.rows.push(row);
    }

    newData.rows.sort((a, b) => a.x - b.x);

    return newData;
};

export const BuildBodyLogChartDataNetwork = (
    rangeStart: string,
    rangeEnd: string,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    metricNames: string[],
    colors: string[]
): Promise<ChartData> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return ApiGetBodyLogStatsTime({
        metrics: metricNames,
        start: rangeStart,
        end: rangeEnd,
        groupby: groupBy,
        aggregate: aggregationFunc,
        timezone,
    }).then((points) => {
        const labelIdx = new Map<string, number>();
        const byBucket = new Map<number, Float32Array>();

        const newData: ChartData = {
            rows: [],
            labels: metricNames,
            colors: metricNames.map((_, i) => colors[i % colors.length]),
        };

        newData.labels.forEach((l, i) => labelIdx.set(l, i));

        for (const point of points) {
            let row = byBucket.get(point.bucket);

            if (!row) {
                row = new Float32Array(newData.labels.length);

                byBucket.set(point.bucket, row);
                newData.rows.push({
                    x: point.bucket,
                    y: row,
                });
            }

            const i = labelIdx.get(point.metric);

            if (i !== undefined) {
                row[i] = point.value;
            }
        }

        newData.rows.sort((a, b) => a.x - b.x);

        return newData;
    });
};
