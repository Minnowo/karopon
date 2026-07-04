import {useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {FormatXLabel, ReadChartFontSize, ShouldTiltXLabels, TiltedLabelTransform, BaseGraphProps} from './graph';
import {NoInformationMessage, GraphStyle, GraphStyleKeys} from './common';
import {useDebouncedCallback} from '../../hooks/useDebounce';
import {GroupBy} from '../../api/types_stats';

type GraphPoint = {x: number; y: number; value: number; date: number};

export type MultiLineGraph2Props = BaseGraphProps & {
    graphStyle?: GraphStyle;
    onGraphStyleChange?: (s: GraphStyle) => void;
};

export function MultiLineGraph2({
    data,
    title,

    timeRanges,
    onTimeRangesChange,

    curTimeRange,
    onTimeRangeChange,

    groupBy,
    onGroupByChange,

    aggregationFunc,
    onAggregationFunc,

    hiddenLabels,
    onHiddenLabelsChange,
    precision = 1,
    graphStyle,
    onGraphStyleChange,
}: MultiLineGraph2Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({width: window.innerWidth, height: window.innerHeight});

    const updateSize = () => setSize({width: containerRef.current!.clientWidth, height: containerRef.current!.clientWidth});
    const [handleResize] = useDebouncedCallback(updateSize, 500);

    useLayoutEffect(() => {
        updateSize();
    }, []);

    useLayoutEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const width = size.width;
    const height = 300;
    const pad = 40;

    const keys = data.labels;
    const visibleCols = useMemo(
        () =>
            data.labels
                .map((label, index) => ({label, index}))
                .filter(({label}) => !hiddenLabels.includes(label))
                .map(({index}) => index),
        [data.labels, hiddenLabels]
    );

    const maxVal = useMemo(() => {
        let max = 0;
        for (const row of data.rows) {
            for (const i of visibleCols) {
                if (max < row.y[i]) {
                    max = row.y[i];
                }
            }
        }
        return max || 1;
    }, [data.rows, visibleCols]);

    const lines = useMemo(() => {
        const l: GraphPoint[][] = new Array(data.labels.length);
        const n = data.rows.length;
        for (const key of visibleCols) {
            const line = new Array<GraphPoint>(n);
            for (let i = 0; i < n; i++) {
                // this unfortunately has bad data layout
                const v = data.rows[i].y[key];

                const x = n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2);
                const y = height - pad - (v / maxVal) * (height - pad * 2);
                line[i] = {x, y, value: v, date: data.rows[i].x};
            }
            l[key] = line;
        }
        return l;
    }, [data, width, maxVal, visibleCols]);

    const chartFontSize = useMemo(() => ReadChartFontSize(), []);

    const tickSpacing = data.rows.length > 1 ? (width - pad * 2) / (data.rows.length - 1) - chartFontSize / 2 : width;
    const tiltLabels = useMemo(
        () =>
            ShouldTiltXLabels(
                data.rows.map((d) => FormatXLabel(d.x, groupBy)),
                tickSpacing,
                chartFontSize
            ),
        [data.rows, groupBy, tickSpacing, chartFontSize]
    );

    const labelPositions = useMemo(() => {
        const positions: Record<string, Map<number, number>> = {};
        const xBuckets = new Map<number, Array<{key: number; y: number}>>();

        for (const key of visibleCols) {
            for (const p of lines[key] ?? []) {
                if (!xBuckets.has(p.x)) {
                    xBuckets.set(p.x, []);
                }
                xBuckets.get(p.x)!.push({key, y: p.y});
            }
        }

        const spacing = 14;
        for (const [, points] of xBuckets) {
            points.sort((a, b) => b.y - a.y);
            let prevAssignedY = Infinity;
            for (const point of points) {
                const adjustedY = Math.min(point.y, prevAssignedY - spacing);
                prevAssignedY = adjustedY;
                if (!positions[point.key]) {
                    positions[point.key] = new Map();
                }
                positions[point.key].set(point.y, adjustedY);
            }
        }

        return positions;
    }, [visibleCols, lines]);

    return (
        <div ref={containerRef} className="w-full">
            <h1 className="text-2xl mb-2">{title}</h1>
            <div className="flex flex-row flex-wrap justify-between">
                <div className="flex gap-2 mb-4">
                    <select
                        className={`px-3 py-1`}
                        value={curTimeRange}
                        onInput={(e) => onTimeRangeChange(Number((e.target as HTMLSelectElement).value))}
                    >
                        {timeRanges &&
                            timeRanges.map((x, i) => (
                                <option key={x.name} value={i}>
                                    {x.name}
                                </option>
                            ))}
                    </select>
                </div>
                <div className="flex gap-2 mb-4">
                    <select
                        className={`px-3 py-1`}
                        value={groupBy}
                        onInput={(e) => onGroupByChange((e.target as HTMLSelectElement).value as GroupBy)}
                    >
                        {Object.values(GroupBy).map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </div>
                {onGraphStyleChange && (
                    <div className="flex gap-2 mb-4">
                        {GraphStyleKeys.map((s) => (
                            <button
                                key={s}
                                className={`px-3 py-1 border rounded ${graphStyle === s ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                                onClick={() => onGraphStyleChange(s)}
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {data.rows.length === 0 ? (
                <div className="p-4 text-center text-yellow-400">{NoInformationMessage}</div>
            ) : (
                <>
                    <svg
                        width={width}
                        height={height + (tiltLabels ? chartFontSize : 0)}
                        viewBox={`0 0 ${width + pad} ${height}`}
                        preserveAspectRatio="xMinYMin meet"
                        className="border border-c-yellow rounded text-c-mantle dark:text-c-text"
                    >
                        {visibleCols.map((key) => {
                            const line = lines[key] ?? [];
                            return (
                                <g key={key}>
                                    <polyline
                                        fill="none"
                                        stroke={data.colors[key]}
                                        strokeWidth="2"
                                        points={line.map((p) => `${p.x},${p.y}`).join(' ')}
                                    />
                                    {line.map((p) => {
                                        const adjustedY = labelPositions[key]?.get(p.y) ?? p.y;
                                        return (
                                            <g key={p.date + key}>
                                                <circle cx={p.x} cy={p.y} r="5" fill={data.colors[key]} />
                                                <text
                                                    x={p.x + 5}
                                                    y={adjustedY - 5}
                                                    fill={data.colors[key]}
                                                    className="text-chart-sm"
                                                    text-anchor="start"
                                                >
                                                    {p.value.toFixed(precision)}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {data.rows.map((d, i) => {
                            const x = data.rows.length <= 1 ? width / 2 : pad + (i / (data.rows.length - 1)) * (width - pad * 2);
                            const label = FormatXLabel(d.x, groupBy);
                            return (
                                <text
                                    key={`${d.x}-x`}
                                    fill="currentColor"
                                    className="text-chart"
                                    text-anchor={tiltLabels ? 'end' : 'start'}
                                    transform={
                                        tiltLabels ? TiltedLabelTransform(x + chartFontSize, height - chartFontSize) : undefined
                                    }
                                    x={tiltLabels ? x + chartFontSize : x - chartFontSize / 2}
                                    y={tiltLabels ? height - chartFontSize : height + 5}
                                >
                                    {label}
                                </text>
                            );
                        })}
                    </svg>

                    <div className="flex flex-wrap gap-3 mt-3">
                        {keys.map((k, i) => {
                            const isActive = !hiddenLabels.includes(k);
                            return (
                                <div
                                    key={k}
                                    className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                                    onClick={() =>
                                        onHiddenLabelsChange(
                                            isActive ? [...hiddenLabels, k] : hiddenLabels.filter((v) => v !== k)
                                        )
                                    }
                                >
                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: data.colors[i]}} />
                                    <span>{k}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
