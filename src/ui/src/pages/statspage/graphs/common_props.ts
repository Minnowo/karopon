import {AggregationFunc, GroupBy} from '../../../api/types_stats';
import {TimeRange} from '../common';

export type DataRow = {
    x: number;
    y: Float32Array;
};

export type ChartData = {
    // labels maps the label to the index in DataRow.y and the colors array.
    // for example:
    // labels = [ "cat", "dog" ]
    // rows.y[0] = cat value
    // rows.y[1] = dog value
    // colors[0] = cat color
    // colors[1] = dog color
    labels: string[];
    colors: string[];
    rows: DataRow[];
};

export type BaseGraphProps = {
    title: string;

    timeRanges: TimeRange[];
    onTimeRangesChange: (range: TimeRange) => void;

    curTimeRange: number;
    onTimeRangeChange: (idx: number) => void;

    groupBy: GroupBy;
    onGroupByChange: (group: GroupBy) => void;

    aggregationFunc: AggregationFunc;
    onAggregationFunc: (agg: AggregationFunc) => void;

    hiddenLabels: string[];
    onHiddenLabelsChange: (keys: string[]) => void;

    data: ChartData;

    precision?: number;
};
