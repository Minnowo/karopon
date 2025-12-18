import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FormatXLabel, MacroTypeKeys, MacroPoint, MacroType, RangeType, RangeTypeKeys, NoInformationMessage } from './common';
import { useDebouncedCallback } from '../../hooks/useDebounce';

type GraphPoint = { x: number; y: number; value: number; date: number };
type GraphLines = {
    carbs: GraphPoint[];
    protein: GraphPoint[];
    fat: GraphPoint[];
    fibre: GraphPoint[];
};
const colors = {
    carbs: '#facc15',
    protein: '#4ade80',
    fat: '#fb7185',
    fibre: '#60a5fa',
} satisfies Record<MacroType, string>;

export const RenderMultiLineGraph = (
    data: MacroPoint[],
    range: RangeType,
    title: string,
    visibleMacros: MacroType[],
    setVisibleMacros: (m: MacroType[]) => void,
    setRange: (r: RangeType) => void
) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    const updateSize = () => setSize({ width: containerRef.current!.clientWidth, height: containerRef.current!.clientWidth });
    const [handleResize] = useDebouncedCallback(updateSize, 500);

    useEffect(() => {
        updateSize();
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [handleResize]);

    const showText = true;
    const width = size.width;
    const height = 300;
    const pad = 40;

    const maxVal = useMemo(() => {
        let max = 0;
        for (const p of data) {
            for (const key of MacroTypeKeys) {
                if (p[key] > max) { max = p[key]; }
            }
        }
        return max;
    }, [data]);

    const lines: GraphLines = useMemo(() => {
        const l = {} as GraphLines;
        for (const key of MacroTypeKeys) {
            const line = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad );
                const y = height - pad - (d[key] / maxVal) * (height - pad * 2);
                line[i] = { x, y, value: d[key], date: d.date };
            }
            l[key] = line;
        }
        return l;
    }, [data, width, height, pad, maxVal]);


    const buckets: Map<number, number[]> = new Map();

    return (
        <div ref={containerRef} className="mb-8 w-full">
            <h1 className="text-2xl mb-2">{title}</h1>
            <div className="flex gap-4 mb-4">
                {RangeTypeKeys.map((r) => (
                    <button
                        key={r}
                        className={`px-3 py-1 border rounded ${range === r ? 'bg-c-yellow text-black' : 'bg-c-d-black'}`}
                        onClick={() => setRange(r as RangeType)}
                    >
                        {r.toUpperCase()}
                    </button>
                ))}
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
                                className="border border-c-yellow rounded"
                            >

                                {visibleMacros.map((key, keyIndex) => {

                                    const line = lines[key];

                                    return (
                                        <g key={key}>
                                            <polyline
                                                fill="none"
                                                stroke={colors[key]}
                                                strokeWidth="2"
                                                points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                                            />

                                            {line.map((p) => {

                                                let bucket = buckets.get(p.x);
                                                if (!bucket) {
                                                    bucket = new Array(visibleMacros.length);
                                                    buckets.set(p.x, bucket);
                                                }
                                                let adjustedY = p.y;
                                                const spacing = 14;

                                                while (bucket.some((off) => Math.abs(off - adjustedY) < spacing)) {
                                                    adjustedY -= 1;
                                                }

                                                bucket[keyIndex] = adjustedY;

                                                return (
                                                    <g key={p.date + key}>
                                                        <circle cx={p.x} cy={p.y} r="5" fill={colors[key]} />
                                                        {showText && (
                                                            <text
                                                                x={p.x}
                                                                y={adjustedY - 10}
                                                                fill={colors[key]}
                                                                fontSize="10"
                                                                textAnchor="end"
                                                            >
                                                                {Number(p.value).toFixed(2)}
                                                            </text>
                                                        )
                                                        }
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })}

                                {data.map((d, i) => {
                                    const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad);
                                    return (
                                        <text
                                            key={`${d.date}-x`}
                                            x={x}
                                            y={height - 5}
                                            fill="white"
                                            fontSize="10"
                                            textAnchor="end"
                                        >
                                            {FormatXLabel(d.date, range)}
                                        </text>
                                    );
                                })}
                            </svg>

                            <div className="flex gap-6 mt-3">
                                {MacroTypeKeys.map((k) => {
                                    const isActive = visibleMacros.includes(k);
                                    return (
                                        <div
                                            key={k}
                                            className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                                            onClick={() => {
                                                setVisibleMacros(
                                                    isActive ? visibleMacros.filter((m) => m !== k) : [...visibleMacros, k]
                                                );
                                            }}
                                        >
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[k] }} />
                                            <span>{k.toUpperCase()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-1">
                                <strong>Note:</strong> You can toggle graphs by clicking the legend components
                            </p>
                        </>
            )}
        </div>
    );
};
