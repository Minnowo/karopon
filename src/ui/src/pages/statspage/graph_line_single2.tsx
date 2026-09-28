import {useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {useDebouncedCallback} from '../../hooks/useDebounce';
import {GraphStyleKeys, NoInformationMessage} from './common';
import {
    FormatXLabel,
    BaseGraphProps,
    ComputeYAxisTicks,
    CommonUnit,
    ReadChartFontSize,
    ShouldTiltXLabels,
    TiltedLabelTransform,
} from './graph';
import {GroupBy} from '../../api/types_stats';

export function LineSingleGraph2({
    data,
    timeRanges,

    curTimeRange,
    onTimeRangeChange,

    groupBy,
    onGroupByChange,

    precision = 1,
    formatValue,
    graphStyle,
    onGraphStyleChange,
    hideZeroValues = false,
    hideValueLabels = false,
    showYAxis = false,
}: BaseGraphProps) {
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

    const color = data.colors[0] ?? 'currentColor';
    const unit = CommonUnit(data, [0]);

    // Pre-extract values for sequential access.
    const values = useMemo(() => {
        const n = data.rows.length;
        const arr = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            arr[i] = data.rows[i].y[0] ?? 0;
        }
        return arr;
    }, [data]);

    const maxVal = useMemo(() => {
        let max = 10;
        for (let i = 0; i < values.length; i++) {
            if (values[i] > max) {
                max = values[i];
            }
        }
        return max;
    }, [values]);

    const points = useMemo(() => {
        const n = data.rows.length;
        return Array.from({length: n}, (_, i) => {
            const x = n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2);
            const v = values[i];
            const y = height - pad - (v / maxVal) * (height - pad * 2);
            return {x, y, value: v, date: data.rows[i].x};
        });
    }, [data, values, maxVal, width]);

    const chartFontSize = useMemo(() => ReadChartFontSize(), []);

    const fmt = formatValue ?? ((v: number) => v.toFixed(precision));

    const yAxisTicks = useMemo(
        () => (showYAxis ? ComputeYAxisTicks(maxVal, height, pad, fmt) : []),
        [showYAxis, maxVal, precision, formatValue]
    );

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

    return (
        <div ref={containerRef} className="w-full">
            <div className="flex flex-row flex-wrap justify-between">
                <div className="flex gap-2 mb-4">
                    <select
                        className={`px-3 py-1`}
                        value={curTimeRange}
                        aria-label="Time range"
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
                        aria-label="Group by"
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
                                className={graphStyle === s ? 'btn-primary' : 'btn-outlined'}
                                onClick={() => onGraphStyleChange(s)}
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {data.rows.length === 0 ? (
                <div className="p-4 text-center text-c-primary">{NoInformationMessage}</div>
            ) : (
                <svg
                    width={width}
                    height={height + chartFontSize}
                    viewBox={`0 0 ${width + pad} ${height + chartFontSize}`}
                    preserveAspectRatio="xMinYMin meet"
                    className="surface-2 p-0 text-c-on-surface-variant"
                >
                    {showYAxis && (
                        <g>
                            <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="currentColor" strokeOpacity="0.4" />
                            {unit && (
                                <text x={pad} y={pad - 10} fill="currentColor" className="text-chart-sm" text-anchor="middle">
                                    {unit}
                                </text>
                            )}
                            {yAxisTicks.map((t) => (
                                <g key={t.label + t.y}>
                                    <line x1={pad - 4} y1={t.y} x2={pad} y2={t.y} stroke="currentColor" strokeOpacity="0.4" />
                                    <text x={pad - 6} y={t.y + 3} fill="currentColor" className="text-chart-sm" text-anchor="end">
                                        {t.label}
                                    </text>
                                </g>
                            ))}
                        </g>
                    )}
                    <polyline fill="none" stroke={color} strokeWidth="2" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
                    {points.map((p) => (
                        <g key={p.date}>
                            <circle cx={p.x} cy={p.y} r="5" fill={color} />
                            {!hideValueLabels && !(hideZeroValues && p.value === 0) && (
                                <text x={p.x + 5} y={p.y - 10} fill={color} className="text-chart-sm" text-anchor="start">
                                    {fmt(p.value)}
                                </text>
                            )}
                        </g>
                    ))}
                    {points.map((p) => {
                        const label = FormatXLabel(p.date, groupBy);
                        return (
                            <text
                                key={`${p.date}-x`}
                                fill="currentColor"
                                className="text-chart"
                                text-anchor={tiltLabels ? 'end' : 'start'}
                                transform={
                                    tiltLabels ? TiltedLabelTransform(p.x + chartFontSize, height - chartFontSize) : undefined
                                }
                                x={tiltLabels ? p.x + chartFontSize : p.x - chartFontSize / 2}
                                y={tiltLabels ? height - chartFontSize : height + 5}
                            >
                                {label}
                            </text>
                        );
                    })}
                </svg>
            )}
        </div>
    );
}
