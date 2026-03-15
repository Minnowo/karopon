export const RangeTypeKeys = ['24 hours', '7 days', '28 days'] as const;
export type RangeType = (typeof RangeTypeKeys)[number];

export const GroupTypeKeys = ['sum', 'average'] as const;
export type GroupType = (typeof GroupTypeKeys)[number];

export type GraphDisplay = {
    range: RangeType;
    group: GroupType;
};

export const NoInformationMessage = 'There is no information to show for this time range';

export type ChartPoint = {
    date: number;
    value: number;
};

export const MacroTypeKeys = ['fat', 'carbs', 'fibre', 'protein'] as const;
export type MacroType = (typeof MacroTypeKeys)[number];

export type MacroPoint = {
    date: number;
} & Record<MacroType, number>;

export type MacroTotals = Record<MacroType, number>;

export type Point2D = {
    x: number;
    y: number;
};

export type ChartType = 'pie' | 'macros' | 'calories' | 'blood_glucose' | 'insulin';

export type DashboardCard = {
    id: string;
    type: ChartType;
    title: string;
    display: GraphDisplay;
    visibleMacros: MacroType[];
};

export const DEFAULT_DASHBOARD: DashboardCard[] = [
    {id: 'd-pie', type: 'pie', title: 'Macronutrient Totals', display: {range: '24 hours', group: 'sum'}, visibleMacros: []},
    {
        id: 'd-macros',
        type: 'macros',
        title: 'Macronutrients Consumed (g)',
        display: {range: '24 hours', group: 'sum'},
        visibleMacros: ['fat', 'carbs', 'fibre', 'protein'],
    },
    {id: 'd-cal', type: 'calories', title: 'Calories (kcal)', display: {range: '24 hours', group: 'sum'}, visibleMacros: []},
    {
        id: 'd-blood',
        type: 'blood_glucose',
        title: 'Blood Glucose (mmol/L)',
        display: {range: '24 hours', group: 'sum'},
        visibleMacros: [],
    },
    {id: 'd-ins', type: 'insulin', title: 'Insulin Taken (mL)', display: {range: '24 hours', group: 'sum'}, visibleMacros: []},
];

export const FormatXLabel = (key: number, range: RangeType): string => {
    switch (range) {
        case '24 hours':
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        case '7 days':
            return new Date(key).toLocaleDateString([], {weekday: 'short'});
        case '28 days':
            return new Date(key).toLocaleDateString([], {month: 'narrow', day: '2-digit'});
    }
};
