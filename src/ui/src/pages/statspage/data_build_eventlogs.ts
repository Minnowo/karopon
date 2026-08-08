import {UserEventFoodLog} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {EventLogPoint} from '../../api/types_stats_eventlogs';
import {ApiGetStatsEventLog} from '../../api/api';
import {DateToGroupByBucket} from './data_build';
import {ChartData, DataRow, EventLogType} from './common';

const NETWORK_SERIES_KEY: Record<EventLogType, keyof EventLogPoint> = {
    blood_glucose: 'blood_glucose',
    recommended_insulin_amount: 'recommended_insulin_amount',
    actual_insulin_taken: 'actual_insulin_taken',
};

export const BuildEventLogChartData = (
    rows: UserEventFoodLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    selectedSeries: EventLogType[],
    colors: string[]
): ChartData => {
    const buckets = new Map<number, {n: number; v: Float32Array}>();

    for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];

        if (row.eventlog.user_time < rangeStartMs || row.eventlog.user_time > rangeEndMs) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(row.eventlog.user_time));
        const values = selectedSeries.map((s) => row.eventlog[s]);

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

export const BuildEventLogChartDataNetwork = (
    rangeStart: string,
    rangeEnd: string,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    selectedSeries: EventLogType[],
    colors: string[]
): Promise<ChartData> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return ApiGetStatsEventLog({
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
