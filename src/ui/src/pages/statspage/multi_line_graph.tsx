import {useEffect, useRef, useState} from 'preact/hooks';
import {FormatXLabel, MacroPoint, RangeType, RangeTypeKeys} from './common';
import {useDebouncedCallback} from '../../hooks/useDebounce';

export const RenderMultiLineGraph = (
    data: MacroPoint[],
    range: RangeType,
    title: string,
    visibleMacros: string[],
    setVisibleMacros: (m: string[]) => void,
    setRange: (r: RangeType) => void,
    currentRange: RangeType
) => {
    const colors = {
        carbs: '#facc15',
        protein: '#4ade80',
        fat: '#fb7185',
        fibre: '#60a5fa',
    };

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

    const isEmpty = data.length === 0;
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
                        className={`px-3 py-1 border rounded ${currentRange === r ? 'bg-c-yellow text-black' : 'bg-c-d-black'}`}
                        onClick={() => setRange(r as RangeType)}
                    >
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            {isEmpty ? (
                <div className="p-6 text-center text-yellow-400">Please log food to see nutrient data</div>
            ) : (
                (() => {
                    const maxVal = Math.max(...data.flatMap((d) => [d.carbs, d.protein, d.fat, d.fibre]), 10);

                    const buildPoints = (key: keyof Omit<MacroPoint, 'date'>) =>
                        data.map((d, i) => {
                            const rawX = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                            const x = Math.max(pad, Math.min(width - pad, rawX));
                            const y = height - pad - (d[key] / maxVal) * (height - pad * 2);
                            return {x, y, value: d[key], date: d.date};
                        });

                    const lines = {
                        carbs: buildPoints('carbs'),
                        protein: buildPoints('protein'),
                        fat: buildPoints('fat'),
                        fibre: buildPoints('fibre'),
                    };

                    return (
                        <svg
                            width={width}
                            height={height}
                            viewBox={`0 0 ${width + pad} ${height}`}
                            preserveAspectRatio="xMinYMin meet"
                            className="border border-c-yellow rounded"
                        >
                            {Object.entries(lines)
                                .filter(([key]) => visibleMacros.includes(key))
                                .map(([key, pts]) => (
                                    <g key={key}>
                                        <polyline
                                            fill="none"
                                            stroke={(colors as any)[key]}
                                            strokeWidth="2"
                                            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                                        />
                                        {pts.map((p) => (
                                            <g key={p.date + key}>
                                                <circle cx={p.x} cy={p.y} r="5" fill={(colors as any)[key]} />
                                                <text x={p.x} y={p.y - 10} fill="white" fontSize="10" textAnchor="middle">
                                                    {Number(p.value).toFixed(2)}
                                                </text>
                                            </g>
                                        ))}
                                    </g>
                                ))}

                            {data.map((d, i) => {
                                const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                                return (
                                    <text key={`${d.date}-x`} x={x} y={height - 5} fill="white" fontSize="10" textAnchor="end">
                                        {FormatXLabel(d.date, range)}
                                    </text>
                                );
                            })}
                        </svg>
                    );
                })()
            )}

            {/* Legend */}
            <div className="flex gap-6 mt-3">
                {Object.entries(colors).map(([k, c]) => {
                    const isActive = visibleMacros.includes(k);
                    return (
                        <div
                            key={k}
                            className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                            onClick={() => {
                                setVisibleMacros(isActive ? visibleMacros.filter((m) => m !== k) : [...visibleMacros, k]);
                            }}
                        >
                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: c}} />
                            <span>{k.toUpperCase()}</span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-1">
                <strong>Note:</strong> You can toggle graphs by clicking the legend components
            </p>
        </div>
    );
};
