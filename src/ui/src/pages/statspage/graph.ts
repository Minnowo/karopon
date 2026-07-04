import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {TimeRange, ChartData, GraphStyle} from './common';
import {DAY_IN_MS} from '../../utils/time';

export type BaseGraphProps = {
    title: string;

    graphStyle?: GraphStyle;
    onGraphStyleChange?: (s: GraphStyle) => void;

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

export const FormatXLabel = (key: number, groupBy: GroupBy): string => {
    switch (groupBy) {
        case GroupBy.One: {
            return '*';
        }
        case GroupBy.Second: {
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
        }
        default:
        case GroupBy.Minute: {
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false});
        }
        case GroupBy.Hour: {
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false});
        }
        case GroupBy.Day: {
            return new Date(key).toLocaleDateString([], {month: 'short', day: '2-digit'});
        }
        case GroupBy.Week: {
            const start = new Date(key).toLocaleDateString([], {month: 'short', day: '2-digit'});
            const stop = new Date(key + DAY_IN_MS * 7).toLocaleDateString([], {month: 'short', day: '2-digit'});
            return `${start} - ${stop}`;
        }
        case GroupBy.Month: {
            return new Date(key).toLocaleDateString([], {year: 'numeric', month: 'short'});
        }
        case GroupBy.Year: {
            return new Date(key).toLocaleDateString([], {year: 'numeric'});
        }
    }
};

// Reads --text-chart (defined in styles.css) so JS-side text measurement stays in sync with the CSS class.
// Not cached here: theme (and thus the CSS value) can change at runtime, so callers should
// memoize this per chart mount (e.g. via useMemo(() => ReadChartFontSize(), [])).
export const ReadChartFontSize = (): number => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--text-chart').trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
};

let measureCtx: CanvasRenderingContext2D | null | undefined;

export const MeasureTextWidth = (text: string, fontSize: number, font = 'sans-serif'): number => {
    if (measureCtx === undefined) {
        measureCtx = document.createElement('canvas').getContext('2d');
    }
    if (!measureCtx) {
        return text.length * fontSize;
    }
    measureCtx.font = `${fontSize}px ${font}`;
    return measureCtx.measureText(text).width;
};

export const ShouldTiltXLabels = (labels: string[], availableWidth: number, fontSize: number): boolean =>
    labels.some((label) => MeasureTextWidth(label, fontSize) > availableWidth);

export const TILT_ANGLE_DEG = -45;

// Rotates a label (text-anchor="end", positioned at pointX/pointY) around that same point,
// so its end stays pinned at pointX/pointY regardless of tilt.
export const TiltedLabelTransform = (pointX: number, pointY: number): string => `rotate(${TILT_ANGLE_DEG} ${pointX} ${pointY})`;
