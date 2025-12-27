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
