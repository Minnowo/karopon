export const RangeTypeKeys = ['today', '24 hours', 'last week', 'last month'] as const;
export type RangeType = (typeof RangeTypeKeys)[number];

export interface ChartPoint {
    date: number;
    value: number;
}

export interface MacroPoint {
    date: number;
    carbs: number;
    protein: number;
    fat: number;
    fibre: number;
}

export interface MacroTotals {
    carbs: number;
    protein: number;
    fat: number;
    fibre: number;
}

export interface Point2D {
    x: number;
    y: number;
}

export const FormatXLabel = (key: number, range: RangeType): string => {
    switch (range) {
        case 'today':
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        case '24 hours':
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        case 'last week':
            return new Date(key).toLocaleDateString([], {day: '2-digit'});
        case 'last month':
            return new Date(key).toLocaleDateString([], {month: 'narrow', day: '2-digit'});
    }
};
