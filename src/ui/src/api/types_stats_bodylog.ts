import {AggregationFunc, GroupBy} from './types_stats';

export type BodyLogStatsTimeRequest = {
    metrics: string[];
    start: string;
    end: string;
    groupby: GroupBy;
    aggregate: AggregationFunc;
    timezone: string;
};

export type BodyLogMetricPoint = {
    metric: string;
    bucket: number; // this is a timestamp
    value: number;
};
