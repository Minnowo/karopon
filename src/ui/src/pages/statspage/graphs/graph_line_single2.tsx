import {useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {useDebouncedCallback} from '../../../hooks/useDebounce';
import {FormatXLabel, NoInformationMessage} from '../common';
import {BaseGraphProps} from './common_props';
import {GroupBy} from '../../../api/types_stats';

export type LineSingleGraph2Props = BaseGraphProps;

export function LineSingleGraph2({
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

    precision = 1,
}: LineSingleGraph2Props) {
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
            </div>
            {data.rows.length === 0 ? (
                <div className="p-4 text-center text-yellow-400">{NoInformationMessage}</div>
            ) : (
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width + pad} ${height}`}
                    preserveAspectRatio="xMinYMin meet"
                    className="border border-c-yellow rounded text-c-mantle dark:text-c-text"
                >
                    <polyline fill="none" stroke={color} strokeWidth="2" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
                    {points.map((p) => (
                        <g key={p.date}>
                            <circle cx={p.x} cy={p.y} r="5" fill={color} />
                            <text x={p.x} y={p.y - 10} fill={color} fontSize="10" textAnchor="middle">
                                {p.value.toFixed(precision)}
                            </text>
                        </g>
                    ))}
                    {points.map((p) => (
                        <text key={`${p.date}-x`} x={p.x} y={height - 5} fill="currentColor" fontSize="10" textAnchor="end">
                            {FormatXLabel(p.date, '24 hours')}
                        </text>
                    ))}
                </svg>
            )}
        </div>
    );
}
