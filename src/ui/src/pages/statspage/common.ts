export const RangeTypeKeys = ['24 hours', '7 days', '28 days'] as const;
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
        case '24 hours':
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        case '7 days':
            return new Date(key).toLocaleDateString([], {weekday: 'short', month: 'narrow', day: '2-digit'});
        case '28 days':
            return new Date(key).toLocaleDateString([], {month: 'narrow', day: '2-digit'});
    }
};
