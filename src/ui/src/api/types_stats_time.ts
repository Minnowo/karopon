import {AggregationFunc, GroupBy} from './types_stats';

export type StatsTimeRequest = {
    columns: string[];
    start: string;
    end: string;
    groupby: GroupBy;
    aggregate: AggregationFunc;
    tags: string[];
};

export type TimespanTagDurationPoint = {
    tag: string;
    bucket: number; // this is a timestamp
    duration_milli: number;
};
