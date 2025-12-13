import {useEffect, useRef, useState} from 'preact/hooks';
import {FormatXLabel, MacroTypeKeys, MacroPoint, MacroType, RangeType, RangeTypeKeys, NoInformationMessage} from './common';
import {useDebouncedCallback} from '../../hooks/useDebounce';

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
    const [size, setSize] = useState({width: window.innerWidth, height: window.innerHeight});

    const updateSize = () => setSize({width: containerRef.current!.clientWidth, height: containerRef.current!.clientWidth});
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

    const width = size.width;
    const height = 300;
    const pad = 40;

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
                (() => {
                    const maxVal = Math.max(...data.flatMap((d) => [d.carbs, d.protein, d.fat, d.fibre]), 10);

                    return (
                        <>
                            <svg
                                width={width}
                                height={height}
                                viewBox={`0 0 ${width + pad} ${height}`}
                                preserveAspectRatio="xMinYMin meet"
                                className="border border-c-yellow rounded"
                            >
                                {visibleMacros.map((key) => {
                                    type GraphPoint = {x: number; y: number; value: number; date: number};
                                    const line = new Array<GraphPoint>(data.length);

                                    for (let i = 0; i < data.length; i++) {
                                        const d = data[i];

                                        const rawX =
                                            data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                                        const x = Math.max(pad, Math.min(width - pad, rawX));
                                        const y = height - pad - (d[key] / maxVal) * (height - pad * 2);
                                        line[i] = {x, y, value: d[key], date: d.date};
                                    }

                                    return (
                                        <g key={key}>
                                            <polyline
                                                fill="none"
                                                stroke={colors[key]}
                                                strokeWidth="2"
                                                points={line.map((p) => `${p.x},${p.y}`).join(' ')}
                                            />
                                            {line.map((p) => (
                                                <g key={p.date + key}>
                                                    <circle cx={p.x} cy={p.y} r="5" fill={colors[key]} />
                                                    <text x={p.x} y={p.y - 10} fill="white" fontSize="10" textAnchor="middle">
                                                        {Number(p.value).toFixed(2)}
                                                    </text>
                                                </g>
                                            ))}
                                        </g>
                                    );
                                })}

                                {data.map((d, i) => {
                                    const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
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
                                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: colors[k]}} />
                                            <span>{k.toUpperCase()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-1">
                                <strong>Note:</strong> You can toggle graphs by clicking the legend components
                            </p>
                        </>
                    );
                })()
            )}
        </div>
    );
};
