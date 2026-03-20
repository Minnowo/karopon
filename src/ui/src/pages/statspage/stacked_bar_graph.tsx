import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {
    FormatXLabel,
    GroupTypeKeys,
    GraphStyleKeys,
    NoInformationMessage,
    RangeTypeKeys,
} from './common';
import {useDebouncedCallback} from '../../hooks/useDebounce';
import {MultiLinePoint, MultiLineGraphProps} from './multi_line_graph';

const CHART_HEIGHT = 300;
const PAD = 40;
const BAR_FILL_RATIO = 0.8; // fraction of each slot occupied by the bar (rest is gap)
const TOOLTIP_MAX_W = 220;

type BarSegment = {key: string; color: string; segY: number; segH: number};

type BarData = {
    point: MultiLinePoint<string>;
    barX: number;
    barW: number;
    segments: BarSegment[];
    total: number;
    totalLabelY: number;
};

export function StackedBarGraph<K extends string>({
    data,
    keys,
    colors,
    labels,
    display,
    title,
    visibleKeys,
    setVisibleKeys,
    setDisplay,
    precision = 1,
    graphStyle,
    onGraphStyleChange,
}: MultiLineGraphProps<K>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(window.innerWidth);
    const [clickedIdx, setClickedIdx] = useState<number | null>(null);

    const updateWidth = () => setWidth(containerRef.current!.clientWidth);
    const [handleResize] = useDebouncedCallback(updateWidth, 500);

    useEffect(() => {
        updateWidth();
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    // Close tooltip when data changes (e.g. range switch).
    useEffect(() => {
        setClickedIdx(null);
    }, [data]);

    const maxTotal = useMemo(() => {
        let max = 0;
        for (const p of data) {
            let sum = 0;
            for (const k of visibleKeys) {
                sum += p[k] ?? 0;
            }
            if (sum > max) { max = sum; }
        }
        return max || 1;
    }, [data, visibleKeys]);

    const bars = useMemo((): BarData[] => {
        if (data.length === 0) { return []; }

        const slotW = (width - PAD * 2) / data.length;
        const barW = slotW * BAR_FILL_RATIO;
        const innerH = CHART_HEIGHT - PAD * 2;

        return data.map((point, i) => {
            const barX = PAD + i * slotW + slotW * (1 - BAR_FILL_RATIO) * 0.5;

            let cumulative = 0;
            const segments: BarSegment[] = [];

            for (const k of visibleKeys) {
                const val = (point[k] as number) ?? 0;
                if (val <= 0) { continue; }
                const segH = (val / maxTotal) * innerH;
                const segY = CHART_HEIGHT - PAD - ((cumulative + val) / maxTotal) * innerH;
                segments.push({key: k, color: colors[k], segY, segH});
                cumulative += val;
            }

            const total = visibleKeys.reduce((s, k) => s + ((point[k] as number) ?? 0), 0);
            const totalLabelY = CHART_HEIGHT - PAD - (total / maxTotal) * innerH - 4;

            return {point, barX, barW, segments, total, totalLabelY};
        });
    }, [data, visibleKeys, colors, maxTotal, width]);

    const clickedBar = clickedIdx !== null ? bars[clickedIdx] : null;

    // Tooltip x is centered on the bar, clamped so it stays within the SVG area.
    const tooltipLeft = clickedBar
        ? Math.max(TOOLTIP_MAX_W / 2, Math.min(clickedBar.barX + clickedBar.barW / 2, width - TOOLTIP_MAX_W / 2))
        : 0;

    return (
        <div ref={containerRef} className="w-full">
            <h1 className="text-2xl mb-2">{title}</h1>
            <div className="flex flex-row flex-wrap justify-between">
                <div className="flex gap-2 mb-4">
                    {RangeTypeKeys.map((r) => (
                        <button
                            key={r}
                            className={`px-3 py-1 border rounded ${display.range === r ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                            onClick={() => setDisplay({...display, range: r})}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 mb-4">
                    {GroupTypeKeys.map((g) => (
                        <button
                            key={g}
                            className={`px-3 py-1 border rounded ${display.group === g ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                            onClick={() => setDisplay({...display, group: g})}
                        >
                            {g.toUpperCase()}
                        </button>
                    ))}
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

            {data.length === 0 ? (
                <div className="p-4 text-center text-yellow-400">{NoInformationMessage}</div>
            ) : (
                <>
                    {/* SVG wrapper is relative so the tooltip can be positioned inside it. */}
                    <div className="relative">
                        <svg
                            width={width}
                            height={CHART_HEIGHT}
                            viewBox={`0 0 ${width + PAD} ${CHART_HEIGHT}`}
                            preserveAspectRatio="xMinYMin meet"
                            className="border border-c-yellow rounded text-c-mantle dark:text-c-text"
                            onClick={() => setClickedIdx(null)}
                        >
                            {bars.map(({point, barX, barW, segments, total, totalLabelY}, i) => (
                                <g
                                    key={point.date}
                                    style={{cursor: 'pointer'}}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setClickedIdx(i === clickedIdx ? null : i);
                                    }}
                                >
                                    {/* Transparent hit area covering the full bar column */}
                                    <rect x={barX} y={PAD} width={barW} height={CHART_HEIGHT - PAD * 2} fill="transparent" />
                                    {segments.map(({key, color, segY, segH}) => (
                                        <rect key={key} x={barX} y={segY} width={barW} height={segH} fill={color} />
                                    ))}
                                    <text x={barX + barW / 2} y={totalLabelY} fill="currentColor" fontSize="9" textAnchor="middle">
                                        {total.toFixed(precision)}
                                    </text>
                                    <text
                                        x={barX + barW / 2}
                                        y={CHART_HEIGHT - 5}
                                        fill="currentColor"
                                        fontSize="10"
                                        textAnchor="middle"
                                    >
                                        {FormatXLabel(point.date, display.range)}
                                    </text>
                                </g>
                            ))}
                        </svg>

                        {clickedBar !== null && (() => {
                            const rows = visibleKeys.filter((k) => ((clickedBar.point[k] as number) ?? 0) > 0);
                            return (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: tooltipLeft,
                                        top: clickedBar.totalLabelY - 8,
                                        transform: 'translateX(-50%) translateY(-100%)',
                                        maxWidth: TOOLTIP_MAX_W,
                                        overflowX: 'auto',
                                    }}
                                    className="container-theme border border-c-yellow rounded px-2 py-1 text-xs shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {rows.map((k) => {
                                        const val = (clickedBar.point[k] as number) ?? 0;
                                        const pct = clickedBar.total > 0 ? ((val / clickedBar.total) * 100).toFixed(1) : '0.0';
                                        return (
                                            <div key={k} className="flex items-center gap-1" style={{whiteSpace: 'nowrap'}}>
                                                <div
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 2,
                                                        backgroundColor: colors[k],
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <span>{labels[k]}: {val.toFixed(precision)} ({pct}%)</span>
                                            </div>
                                        );
                                    })}
                                    <div style={{whiteSpace: 'nowrap'}} className="font-bold mt-0.5 border-t border-c-overlay1 pt-0.5">
                                        Total: {clickedBar.total.toFixed(precision)}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3">
                        {keys.map((k) => {
                            const isActive = visibleKeys.includes(k);
                            return (
                                <div
                                    key={k}
                                    className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                                    onClick={() =>
                                        setVisibleKeys(isActive ? visibleKeys.filter((v) => v !== k) : [...visibleKeys, k])
                                    }
                                >
                                    <div className="w-4 h-4 rounded-sm" style={{backgroundColor: colors[k]}} />
                                    <span>{labels[k]}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
