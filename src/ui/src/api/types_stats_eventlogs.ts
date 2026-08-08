import {AggregationFunc, GroupBy} from './types_stats';

export type EventLogStatsRequest = {
    start: string;
    end: string;
    groupby: GroupBy;
    aggregate: AggregationFunc;
    timezone: string;
};

export type EventLogPoint = {
    bucket: number; // this is a timestamp
    blood_glucose: number;
    recommended_insulin_amount: number;
    actual_insulin_taken: number;
};
