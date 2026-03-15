import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {BpPoint, FormatXLabel, GroupTypeKeys, NoInformationMessage, GraphDisplay, RangeTypeKeys} from './common';
import {useDebouncedCallback} from '../../hooks/useDebounce';

type BpKey = 'systolic' | 'diastolic';
type GraphPoint = {x: number; y: number; value: number; date: number};

const colors: Record<BpKey, string> = {
    systolic: 'var(--color-c-red)',
    diastolic: 'var(--color-c-pink)',
};

const BP_KEYS: BpKey[] = ['systolic', 'diastolic'];

export const RenderBpGraph = (data: BpPoint[], display: GraphDisplay, title: string, setDisplay: (d: GraphDisplay) => void) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({width: window.innerWidth, height: window.innerHeight});
    const [visibleLines, setVisibleLines] = useState<BpKey[]>(['systolic', 'diastolic']);

    const updateSize = () => setSize({width: containerRef.current!.clientWidth, height: containerRef.current!.clientWidth});
    const [handleResize] = useDebouncedCallback(updateSize, 500);

    useEffect(() => {
        updateSize();
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const width = size.width;
    const height = 300;
    const pad = 40;

    const maxVal = useMemo(() => {
        let max = 0;
        for (const p of data) {
            if (p.systolic > max) {
                max = p.systolic;
            }
            if (p.diastolic > max) {
                max = p.diastolic;
            }
        }
        return max || 1;
    }, [data]);

    const lines = useMemo(() => {
        const result = {} as Record<BpKey, GraphPoint[]>;
        for (const key of BP_KEYS) {
            result[key] = data.map((d, i) => {
                const x = data.length <= 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
                const y = height - pad - (d[key] / maxVal) * (height - pad * 2);
                return {x, y, value: d[key], date: d.date};
            });
        }
        return result;
    }, [data, width, maxVal]);

    return (
        <div ref={containerRef} className="mb-8 w-full">
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
                        {visibleLines.map((key) => {
                            const line = lines[key];
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
                                            <text x={p.x + 5} y={p.y - 5} fill={colors[key]} fontSize="10" textAnchor="end">
                                                {p.value.toFixed(0)}
                                            </text>
                                        </g>
                                    ))}
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

                    <div className="flex gap-6 mt-3">
                        {BP_KEYS.map((key) => {
                            const isActive = visibleLines.includes(key);
                            return (
                                <div
                                    key={key}
                                    className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                                    onClick={() =>
                                        setVisibleLines(isActive ? visibleLines.filter((k) => k !== key) : [...visibleLines, key])
                                    }
                                >
                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: colors[key]}} />
                                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};
