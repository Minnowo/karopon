import {AggregationFunc, GroupBy} from './types_stats';

export type MacroStatsRequest = {
    start: string;
    end: string;
    groupby: GroupBy;
    aggregate: AggregationFunc;
    timezone: string;
};

export type MacronutrientPoint = {
    bucket: number; // this is a timestamp
    carb: number;
    net_carb: number;
    fat: number;
    fibre: number;
    protein: number;
    calorie: number;
};
