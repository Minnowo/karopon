import {useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {FormatXLabel, GroupTypeKeys, GraphStyleKeys, NoInformationMessage, RangeTypeKeys} from '../common';
import {useDebouncedCallback} from '../../../hooks/useDebounce';
import {MultiLineGraph2Props} from './graph_line_multi2';
import {GroupBy} from '../../../api/types_stats';

const CHART_HEIGHT = 300;
const PAD = 40;
const BAR_FILL_RATIO = 0.8;
const TOOLTIP_MAX_W = 220;

type BarSegment = {key: number; segY: number; segH: number};

type BarData = {
    x: number;
    barX: number;
    barW: number;
    segments: BarSegment[];
    total: number;
    totalLabelY: number;
    vals: Float32Array;
};

// Reuses MultiLineGraph2Props since the two are swappable (same data shape, different render).
export function StackedBarGraph2({
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
    const [width, setWidth] = useState(window.innerWidth);
    const [clickedIdx, setClickedIdx] = useState<number | null>(null);

    const updateWidth = () => setWidth(containerRef.current!.clientWidth);
    const [handleResize] = useDebouncedCallback(updateWidth, 500);

    useLayoutEffect(() => {
        updateWidth();
    }, []);

    useLayoutEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    useLayoutEffect(() => {
        setClickedIdx(null);
    }, [data]);

    const visibleCols = useMemo(
        () =>
            data.labels
                .map((label, index) => ({label, index}))
                .filter(({label}) => !hiddenLabels.includes(label))
                .map(({index}) => index),
        [data.labels, hiddenLabels]
    );

    const bars = useMemo((): BarData[] => {
        if (data.rows.length === 0) {
            return [];
        }

        const maxTotal = (() => {
            let max = 0;
            for (const row of data.rows) {
                let sum = 0;

                for (const i of visibleCols) {
                    sum += row.y[i];
                }

                if (max < sum) {
                    max = sum;
                }
            }
            return max || 1;
        })();

        const n = data.rows.length;
        const slotW = (width - PAD * 2) / n;
        const barW = slotW * BAR_FILL_RATIO;
        const innerH = CHART_HEIGHT - PAD * 2;

        return data.rows.map((row, i) => {
            let cumulative = 0;
            const segments: BarSegment[] = [];

            for (const k of visibleCols) {
                const val = row.y[k];

                if (val <= 0) {
                    continue;
                }

                cumulative += val;

                const segH = (val / maxTotal) * innerH;
                const segY = CHART_HEIGHT - PAD - (cumulative / maxTotal) * innerH;
                segments.push({key: k, segY, segH});
            }

            const totalLabelY = CHART_HEIGHT - PAD - (cumulative / maxTotal) * innerH - 4;
            const barX = PAD + i * slotW + slotW * (1 - BAR_FILL_RATIO) * 0.5;

            return {x: row.x, barX, barW, segments, total: cumulative, totalLabelY, vals: row.y};
        });
    }, [data, visibleCols, width]);

    const clickedBar = clickedIdx !== null ? bars[clickedIdx] : null;
    const tooltipLeft = clickedBar
        ? Math.max(TOOLTIP_MAX_W / 2, Math.min(clickedBar.barX + clickedBar.barW / 2, width - TOOLTIP_MAX_W / 2))
        : 0;

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
                    <div className="relative">
                        <svg
                            width={width}
                            height={CHART_HEIGHT}
                            viewBox={`0 0 ${width + PAD} ${CHART_HEIGHT}`}
                            preserveAspectRatio="xMinYMin meet"
                            className="border border-c-yellow rounded text-c-mantle dark:text-c-text"
                            onClick={() => setClickedIdx(null)}
                        >
                            {bars.map(({x, barX, barW, segments, total, totalLabelY}, i) => (
                                <g
                                    key={x}
                                    style={{cursor: 'pointer'}}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setClickedIdx(i === clickedIdx ? null : i);
                                    }}
                                >
                                    <rect x={barX} y={PAD} width={barW} height={CHART_HEIGHT - PAD * 2} fill="transparent" />
                                    {segments.map(({key, segY, segH}) => (
                                        <rect key={key} x={barX} y={segY} width={barW} height={segH} fill={data.colors[key]} />
                                    ))}
                                    <text
                                        x={barX + barW / 2}
                                        y={totalLabelY}
                                        fill="currentColor"
                                        fontSize="9"
                                        textAnchor="middle"
                                    >
                                        {total.toFixed(precision)}
                                    </text>
                                    <text
                                        x={barX + barW / 2}
                                        y={CHART_HEIGHT - 5}
                                        fill="currentColor"
                                        fontSize="10"
                                        textAnchor="middle"
                                    >
                                        {FormatXLabel(x, '24 hours')}
                                    </text>
                                </g>
                            ))}
                        </svg>

                        {clickedBar !== null && (
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
                                {visibleCols
                                    .filter((k) => (clickedBar.vals[k] ?? 0) > 0)
                                    .map((k) => {
                                        const val = clickedBar.vals[k];
                                        const pct = clickedBar.total > 0 ? ((val / clickedBar.total) * 100).toFixed(1) : '0.0';
                                        return (
                                            <div key={k} className="flex items-center gap-1" style={{whiteSpace: 'nowrap'}}>
                                                <div
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 2,
                                                        backgroundColor: data.colors[k],
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <span>
                                                    {data.labels[k]}: {val.toFixed(precision)} ({pct}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                <div
                                    style={{whiteSpace: 'nowrap'}}
                                    className="font-bold mt-0.5 border-t border-c-overlay1 pt-0.5"
                                >
                                    Total: {clickedBar.total.toFixed(precision)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3">
                        {data.labels.map((k, i) => {
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
                                    <div className="w-4 h-4 rounded-sm" style={{backgroundColor: data.colors[i]}} />
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
