import {useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {
    FormatXLabel,
    GroupTypeKeys,
    GraphDisplay,
    GraphStyle,
    GraphStyleKeys,
    NoInformationMessage,
    RangeTypeKeys,
} from './common';
import {useDebouncedCallback} from '../../hooks/useDebounce';

type GraphPoint = {x: number; y: number; value: number; date: number};

export type MultiLinePoint<K extends string> = {date: number} & Record<K, number>;

export type MultiLineGraphProps<K extends string> = {
    data: Array<MultiLinePoint<K>>;
    keys: readonly K[];
    colors: Record<K, string>;
    labels: Record<K, string>;
    display: GraphDisplay;
    title: string;
    visibleKeys: K[];
    setVisibleKeys: (keys: K[]) => void;
    setDisplay: (d: GraphDisplay) => void;
    precision?: number;
    graphStyle?: GraphStyle;
    onGraphStyleChange?: (s: GraphStyle) => void;
};

export function MultiLineGraph<K extends string>({
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

    const maxVal = useMemo(() => {
        let max = 0;
        for (const p of data) {
            for (const key of keys) {
                if (p[key] > max) {
                    max = p[key];
                }
            }
        }
        return max || 1;
    }, [data, keys]);

    const lines = useMemo(() => {
        const l = {} as Record<K, GraphPoint[]>;
        for (const key of keys) {
            const line = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                const y = height - pad - (d[key] / maxVal) * (height - pad * 2);
                line[i] = {x, y, value: d[key], date: d.date};
            }
            l[key] = line;
        }
        return l;
    }, [data, keys, width, maxVal]);

    const labelPositions = useMemo(() => {
        const positions: Partial<Record<K, Map<number, number>>> = {};
        const xBuckets = new Map<number, Array<{key: K; y: number}>>();

        for (const key of visibleKeys) {
            for (const p of lines[key]) {
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
                positions[point.key]!.set(point.y, adjustedY);
            }
        }

        return positions as Record<K, Map<number, number>>;
    }, [visibleKeys, lines]);

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
                    <svg
                        width={width}
                        height={height}
                        viewBox={`0 0 ${width + pad} ${height}`}
                        preserveAspectRatio="xMinYMin meet"
                        className="border border-c-yellow rounded text-c-mantle dark:text-c-text"
                    >
                        {visibleKeys.map((key) => {
                            const line = lines[key];
                            return (
                                <g key={key}>
                                    <polyline
                                        fill="none"
                                        stroke={colors[key]}
                                        strokeWidth="2"
                                        points={line.map((p) => `${p.x},${p.y}`).join(' ')}
                                    />
                                    {line.map((p) => {
                                        const adjustedY = labelPositions[key]?.get(p.y) ?? p.y;
                                        return (
                                            <g key={p.date + key}>
                                                <circle cx={p.x} cy={p.y} r="5" fill={colors[key]} />
                                                <text
                                                    x={p.x + 5}
                                                    y={adjustedY - 5}
                                                    fill={colors[key]}
                                                    fontSize="10"
                                                    textAnchor="end"
                                                >
                                                    {p.value.toFixed(precision)}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {data.map((d, i) => {
                            const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                            return (
                                <text key={`${d.date}-x`} x={x} y={height - 5} fill="currentColor" fontSize="10" textAnchor="end">
                                    {FormatXLabel(d.date, display.range)}
                                </text>
                            );
                        })}
                    </svg>

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
                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: colors[k]}} />
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

// Backward-compatible function wrapper for existing call sites.
export const RenderGenericMultiLineGraph = <K extends string>(
    data: Array<MultiLinePoint<K>>,
    keys: readonly K[],
    colors: Record<K, string>,
    labels: Record<K, string>,
    display: GraphDisplay,
    title: string,
    visibleKeys: K[],
    setVisibleKeys: (keys: K[]) => void,
    setDisplay: (d: GraphDisplay) => void,
    precision = 1
) => (
    <MultiLineGraph
        data={data}
        keys={keys}
        colors={colors}
        labels={labels}
        display={display}
        title={title}
        visibleKeys={visibleKeys}
        setVisibleKeys={setVisibleKeys}
        setDisplay={setDisplay}
        precision={precision}
    />
);
