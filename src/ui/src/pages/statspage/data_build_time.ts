import {TaggedTimespan} from '../../api/types';
import {TagToString} from '../../utils/tags';
import {ChartData, DataRow} from './graphs/common_props';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {ApiGetStatsTime} from '../../api/api';
import {DateToGroupByBucket} from './data_build';

export const BuildTimeChartDataNetwork = async (
    rangeStart: string,
    rangeEnd: string,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    selectedTags: string[],
    colors: string[]
): Promise<ChartData> => {
    return ApiGetStatsTime({
        columns: [],
        start: rangeStart,
        end: rangeEnd,
        groupby: groupBy,
        aggregate: aggregationFunc,
        tags: selectedTags,
    }).then((points) => {
        const labelIdx = new Map<string, number>();
        const byBucket = new Map<number, Float32Array>();

        const newData: ChartData = {
            rows: [],
            labels: selectedTags,
            colors: selectedTags.map((_, i) => colors[i % colors.length]),
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

            const i = labelIdx.get(point.tag);

            if (i !== undefined) {
                row[i] = Math.round((point.duration_milli / 3_600_000) * 100) / 100;
            }
        }

        return newData;
    });
};

export const BuildTimeChartData = (
    spans: TaggedTimespan[],

    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    selectedTags: string[],
    colors: string[]
): ChartData => {
    if (selectedTags.length === 0) {
        return {rows: [], labels: [], colors: []};
    }

    const selectedSet = new Set(selectedTags);
    const buckets = new Map<number, Map<string, {n: number; total: number}>>();

    for (const {timespan, tags} of spans) {
        if (timespan.stop_time <= timespan.start_time) {
            continue;
        }
        if (timespan.start_time < rangeStartMs || timespan.start_time > rangeEndMs) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(timespan.start_time));

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, new Map());
        }

        const bucket = buckets.get(bucketKey)!;
        const durationMillis = timespan.stop_time - timespan.start_time;

        for (const t of tags) {
            const k = TagToString(t);
            if (!selectedSet.has(k)) {
                continue;
            }
            if (!bucket.has(k)) {
                bucket.set(k, {n: 0, total: 0});
            }
            const entry = bucket.get(k)!;
            switch (aggregationFunc) {
                case AggregationFunc.Sum: {
                    entry.n = 1;
                    entry.total += durationMillis;
                    break;
                }
                case AggregationFunc.Avg: {
                    entry.n++;
                    entry.total += durationMillis;
                    break;
                }
                case AggregationFunc.Min: {
                    if (entry.n === 0) {
                        entry.n = 1;
                        entry.total = durationMillis;
                    }
                    if (entry.total > durationMillis) {
                        entry.total = durationMillis;
                    }
                    break;
                }
                case AggregationFunc.Max: {
                    if (entry.n === 0) {
                        entry.n = 1;
                        entry.total = durationMillis;
                    }
                    if (entry.total < durationMillis) {
                        entry.total = durationMillis;
                    }
                    break;
                }
            }
        }

        if (bucket.size === 0) {
            buckets.delete(bucketKey);
        }
    }

    const newData: ChartData = {
        rows: [],
        labels: selectedTags,
        colors: selectedTags.map((_, i) => colors[i % colors.length]),
    };

    const labelIdx = new Map<string, number>();
    newData.labels.forEach((l, i) => labelIdx.set(l, i));

    for (const [date, ys] of buckets.entries()) {
        const row: DataRow = {
            x: date,
            y: new Float32Array(selectedTags.length),
        };

        for (const [tag, agg] of ys.entries()) {
            const i = labelIdx.get(tag)!;

            row.y[i] = agg.total / agg.n / 3_600_000; // into hours
        }

        newData.rows.push(row);
    }

    return newData;
};
