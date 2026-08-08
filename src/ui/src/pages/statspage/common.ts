import {AggregationFunc, GroupBy} from '../../api/types_stats';

export const NoInformationMessage = 'There is no information to show for this time range';

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

export const MacroTypeKeys = ['fat', 'carbs', 'net_carbs', 'fibre', 'protein', 'calorie'] as const;
export type MacroType = (typeof MacroTypeKeys)[number];

export const EventLogTypeKeys = ['blood_glucose', 'recommended_insulin_amount', 'actual_insulin_taken'] as const;
export type EventLogType = (typeof EventLogTypeKeys)[number];

export type ChartType = 'macros' | 'eventlogs' | 'bodylog' | 'time';

export const GraphStyleKeys = ['line', 'bar', 'table', 'pie'] as const;
export type GraphStyle = (typeof GraphStyleKeys)[number];

export type TimeRange = {
    name: string;
    rangeStart: string;
    rangeEnd: string;
    groupBy: GroupBy;
    aggregationFunc: AggregationFunc;
};

export type DashboardCard = {
    id: number;
    type: ChartType;
    title: string;
    visibleMacros: MacroType[];
    visibleEventLogs: EventLogType[];
    selectedTags: string[];
    selectedMetrics?: string[];
    graphStyle?: GraphStyle;

    hiddenLabels: string[];
    timeRanges: TimeRange[];
    curTimeRange: number;
    useNetwork: boolean;
    hideZeroValues?: boolean;
    hideValueLabels?: boolean;
    showYAxis?: boolean;
};

export type UserDashboard = {
    id: number;
    name: string;
    cards: DashboardCard[];
};

export const CommonRanges: TimeRange[] = [
    {
        name: '24 hours',
        rangeStart: 'now-24h',
        rangeEnd: 'now+24h',
        groupBy: GroupBy.Minute,
        aggregationFunc: AggregationFunc.Sum,
    },
    {
        name: '7 days',
        rangeStart: 'now-7d',
        rangeEnd: 'now+1d',
        groupBy: GroupBy.Day,
        aggregationFunc: AggregationFunc.Sum,
    },
    {
        name: '28 days',
        rangeStart: 'now-28d',
        rangeEnd: 'now+1d',
        groupBy: GroupBy.Day,
        aggregationFunc: AggregationFunc.Sum,
    },
];

export const DEFAULT_DASHBOARD: UserDashboard = {
    id: -1,
    name: 'Default',
    cards: [
        {
            id: 0,
            type: 'macros',
            title: 'Macronutrients Consumed (g)',
            visibleMacros: ['fat', 'net_carbs', 'fibre', 'protein'],
            visibleEventLogs: [],
            selectedTags: [],
            timeRanges: CommonRanges,
            curTimeRange: 0,
            hiddenLabels: [],
            useNetwork: false,
        },
        {
            id: 1,
            type: 'eventlogs',
            title: 'Blood Glucose & Insulin',
            visibleMacros: [],
            visibleEventLogs: ['blood_glucose', 'actual_insulin_taken'],
            selectedTags: [],
            timeRanges: CommonRanges,
            curTimeRange: 0,
            hiddenLabels: [],
            useNetwork: false,
        },
    ],
};
