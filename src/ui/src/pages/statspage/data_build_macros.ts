import {UserEventFoodLog} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {DateToGroupByBucket} from './data_build';
import {ChartData, DataRow} from './graphs/common_props';

export const BuildMacroChartData = (
    rows: UserEventFoodLog[],
    rangeStartMs: number,
    rangeEndMs: number,
    groupBy: GroupBy,
    aggregationFunc: AggregationFunc,
    colors: string[] = ['var(--color-c-flamingo)', 'var(--color-c-yellow)', 'var(--color-c-sapphire)', 'var(--color-c-green)']
): ChartData => {
    const fat = 0;
    const car = 1;
    const fib = 2;
    const pro = 3;

    const buckets = new Map<number, DataRow>();

    for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];

        if (row.eventlog.user_time < rangeStartMs || row.eventlog.user_time > rangeEndMs) {
            continue;
        }

        const bucketKey = DateToGroupByBucket(groupBy, new Date(row.eventlog.user_time));

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, {
                x: 0, // we use this to count stuff for average, and then set it as the actual x later
                y: new Float32Array(4),
            });
        }

        const bucket = buckets.get(bucketKey)!;

        // use net carbs
        const total_net_carb = row.total_carb - row.total_fibre;

        switch (aggregationFunc) {
            case AggregationFunc.Sum: {
                bucket.x = 1;
                bucket.y[fat] += row.total_fat;
                bucket.y[car] += total_net_carb;
                bucket.y[fib] += row.total_fibre;
                bucket.y[pro] += row.total_protein;
                break;
            }
            case AggregationFunc.Avg: {
                bucket.x++;
                bucket.y[fat] += row.total_fat;
                bucket.y[car] += total_net_carb;
                bucket.y[fib] += row.total_fibre;
                bucket.y[pro] += row.total_protein;
                break;
            }
            case AggregationFunc.Min: {
                if (bucket.x === 0) {
                    bucket.x = 1;
                    bucket.y[fat] = row.total_fat;
                    bucket.y[car] = total_net_carb;
                    bucket.y[fib] = row.total_fibre;
                    bucket.y[pro] = row.total_protein;
                }
                if (bucket.y[fat] > row.total_fat) {
                    bucket.y[fat] = row.total_fat;
                }
                if (bucket.y[car] > total_net_carb) {
                    bucket.y[car] = total_net_carb;
                }
                if (bucket.y[fib] > row.total_fibre) {
                    bucket.y[fib] = row.total_fibre;
                }
                if (bucket.y[pro] > row.total_protein) {
                    bucket.y[pro] = row.total_protein;
                }
                break;
            }
            case AggregationFunc.Max: {
                if (bucket.x === 0) {
                    bucket.x = 1;
                    bucket.y[fat] = row.total_fat;
                    bucket.y[car] = total_net_carb;
                    bucket.y[fib] = row.total_fibre;
                    bucket.y[pro] = row.total_protein;
                }
                if (bucket.y[fat] < row.total_fat) {
                    bucket.y[fat] = row.total_fat;
                }
                if (bucket.y[car] < total_net_carb) {
                    bucket.y[car] = total_net_carb;
                }
                if (bucket.y[fib] < row.total_fibre) {
                    bucket.y[fib] = row.total_fibre;
                }
                if (bucket.y[pro] < row.total_protein) {
                    bucket.y[pro] = row.total_protein;
                }
                break;
            }
        }
    }

    const newData: ChartData = {
        rows: new Array(buckets.size),
        labels: new Array(4),
        colors,
    };
    newData.labels[fat] = 'fat';
    newData.labels[car] = 'carbs';
    newData.labels[fib] = 'fibre';
    newData.labels[pro] = 'protein';

    let row = 0;
    for (const [date, ys] of buckets.entries()) {
        if (aggregationFunc === AggregationFunc.Avg) {
            for (let i = 0; i < 4; i++) {
                // ys.y is the sum
                // ys.x is the count
                ys.y[i] /= ys.x;
            }
        }

        ys.x = date;
        newData.rows[row] = ys;
        row++;
    }

    return newData;
};
