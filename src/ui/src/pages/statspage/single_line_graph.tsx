import {useEffect, useRef, useState} from 'preact/hooks';
import {useDebouncedCallback} from '../../hooks/useDebounce';
import {ChartPoint, RangeType, RangeTypeKeys, FormatXLabel, NoInformationMessage} from './common';

export const RenderGraph = <T extends ChartPoint>(
    data: T[],
    range: RangeType,
    valueKey: keyof T,
    title: string,
    color: string,
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
                    const maxVal = Math.max(...data.map((d) => Number(d[valueKey])), 10);
                    const points = data.map((d, i) => {
                        const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                        const y = height - pad - (Number(d[valueKey]) / maxVal) * (height - pad * 2);
                        return {x, y, value: Number(d[valueKey]), date: d.date};
                    });

                    return (
                        <svg
                            width={width}
                            height={height}
                            viewBox={`0 0 ${width + pad} ${height}`}
                            preserveAspectRatio="xMinYMin meet"
                            className="border border-c-yellow rounded text-c-black dark:text-c-white"
                        >
                            <polyline
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            />
                            {points.map((p) => (
                                <g key={p.date}>
                                    <circle cx={p.x} cy={p.y} r="5" fill={color} />
                                    <text x={p.x} y={p.y - 10} fill={color} fontSize="10" textAnchor="middle">
                                        {Number(p.value).toFixed(1)}
                                    </text>
                                </g>
                            ))}
                            {points.map((p) => (
                                <text
                                    key={`${p.date}-x`}
                                    x={p.x}
                                    y={height - 5}
                                    fill="currentColor"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {FormatXLabel(p.date, range)}
                                </text>
                            ))}
                        </svg>
                    );
                })()
            )}
        </div>
    );
};
