import { BaseState } from '../state/basestate';
import { useEffect, useState } from 'preact/hooks';
import { TblUserEventLog, TblUserFoodLog } from '../api/types';
import { GetUserFoodLog } from '../api/api';

type RangeType = 'daily' | 'weekly' | 'monthly' | 'yearly';

type EventKey = 'net_carbs' | 'blood_glucose' | 'actual_insulin_taken';

type MacroPoint = {
    date: string;
    carbs: number;
    protein: number;
    fat: number;
    fibre: number;
};

type MacroTotals = {
    carbs: number;
    protein: number;
    fat: number;
    fibre: number;
};

export function StatsPage(state: BaseState) {
    const eventLogs = state.eventlog ?? [];
    const [foodLogs, setFoodLogs] = useState<TblUserFoodLog[]>([]);

    const [carbRange, setCarbRange] = useState<RangeType>('daily');
    const [bloodRange, setBloodRange] = useState<RangeType>('daily');
    const [insulinRange, setInsulinRange] = useState<RangeType>('daily');

    const [macroData, setMacroData] = useState<MacroPoint[]>([]);
    const [bloodData, setBloodData] = useState<{ date: string; blood_glucose: number }[]>([]);
    const [insulinData, setInsulinData] = useState<{ date: string; actual_insulin_taken: number }[]>([]);
    const [macros, setMacros] = useState<MacroTotals | null>(null);

    const [visibleMacros, setVisibleMacros] = useState<string[]>(['carbs', 'protein', 'fat', 'fibre']);

    // Load food logs
    useEffect(() => {
        GetUserFoodLog().then((data) => setFoodLogs(data || []));
    }, []);

    // Build macro graph data
    useEffect(() => {
        setMacroData(buildMacroChartData(foodLogs, carbRange));
    }, [foodLogs, carbRange]);

    // Build blood and insulin graph data
    useEffect(() => setBloodData(buildChartData(eventLogs, 'blood_glucose', bloodRange)), [eventLogs, bloodRange]);
    useEffect(() => setInsulinData(buildChartData(eventLogs, 'actual_insulin_taken', insulinRange)), [eventLogs, insulinRange]);

    // Build today's totals for pie chart
    useEffect(() => {
        if (foodLogs.length) setMacros(buildTodayMacros(foodLogs));
    }, [foodLogs]);

    if (!eventLogs) return <div className="p-4">Loading...</div>;

    /* --------------------------- SINGLE LINE GRAPH --------------------------- */
    const renderGraph = <T extends { date: string }>(
        data: T[],
        range: RangeType,
        valueKey: keyof T,
        title: string,
        color: string,
        setRange: (r: RangeType) => void,
        currentRange: RangeType = range
    ) => {
        const isEmpty = data.length === 0;

        return (
            <div className="mb-8">
                <h1 className="text-2xl mb-2">{title}</h1>
                <div className="flex gap-4 mb-4">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((r) => (
                        <button
                            key={r}
                            className={`px-3 py-1 border rounded ${
                                currentRange === r ? 'bg-c-yellow text-black' : 'bg-c-d-black'
                            }`}
                            onClick={() => setRange(r as RangeType)}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>
                {isEmpty ? (
                    <div className="p-6 text-center text-yellow-400">
                        Please enter an event to see data
                    </div>
                ) : (
                    (() => {
                        const maxVal = Math.max(...data.map((d) => Number(d[valueKey])), 10);
                        const points =
                            data.length <= 1
                                ? data.map((d) => ({ x: 300, y: 150, value: Number(d[valueKey]), date: d.date }))
                                : data.map((d, i) => {
                                    const rawX = 40 + (i / (data.length - 1)) * (600 - 40 * 2);
                                    const x = Math.max(40, Math.min(600 - 40, rawX));
                                    const y = 300 - 40 - (Number(d[valueKey]) / maxVal) * (300 - 40 * 2);
                                    return { x, y, value: Number(d[valueKey]), date: d.date };
                                });

                        return (
                            <svg
                                width={600}
                                height={300}
                                viewBox={`0 0 650 300`}
                                preserveAspectRatio="xMinYMin meet"
                                className="border border-c-yellow rounded"
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
                                        <text x={p.x} y={p.y - 10} fill="white" fontSize="10" textAnchor="middle">
                                            {Number(p.value).toFixed(2)}
                                        </text>
                                    </g>
                                ))}
                                {points.map((p) => (
                                    <text
                                        key={p.date + '-x'}
                                        x={p.x}
                                        y={300 - 5}
                                        fill="white"
                                        fontSize="10"
                                        textAnchor="end"
                                    >
                                        {formatXLabel(p.date, range)}
                                    </text>
                                ))}
                            </svg>
                        );
                    })()
                )}
            </div>
        );
    };

    /* --------------------------- MULTI LINE MACRO GRAPH --------------------------- */
    const renderMultiLineGraph = (
        data: MacroPoint[],
        range: RangeType,
        title: string,
        setRange: (r: RangeType) => void,
        currentRange: RangeType
    ) => {
        const colors = {
            carbs: '#facc15',
            protein: '#4ade80',
            fat: '#fb7185',
            fibre: '#60a5fa'
        };

        const isEmpty = data.length === 0;

        return (
            <div className="mb-8">
                <h1 className="text-2xl mb-2">{title}</h1>
                <div className="flex gap-4 mb-4">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((r) => (
                        <button
                            key={r}
                            className={`px-3 py-1 border rounded ${
                                currentRange === r ? 'bg-c-yellow text-black' : 'bg-c-d-black'
                            }`}
                            onClick={() => setRange(r as RangeType)}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>

                {isEmpty ? (
                    <div className="p-6 text-center text-yellow-400">
                        Please log food to see nutrient data
                    </div>
                ) : (
                    (() => {
                        const width = 600;
                        const height = 300;
                        const padding = 40;

                        const maxVal = Math.max(
                            ...data.flatMap((d) => [d.carbs, d.protein, d.fat, d.fibre]),
                            10
                        );

                        const buildPoints = (key: keyof Omit<MacroPoint, 'date'>) =>
                            data.map((d, i) => {
                                const rawX = data.length <= 1
                                ? width / 2
                                : padding + (i / (data.length - 1)) * (width - padding * 2);
                                const x = Math.max(padding, Math.min(width - padding, rawX));
                                const y = height - padding - (d[key] / maxVal) * (height - padding * 2);
                                return { x, y, value: d[key], date: d.date };
                            });

                        const lines = {
                            carbs: buildPoints('carbs'),
                            protein: buildPoints('protein'),
                            fat: buildPoints('fat'),
                            fibre: buildPoints('fibre')
                        };

                        return (
                            <svg
                                width={width}
                                height={height}
                                viewBox={`0 0 650 300`}
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
                                            <text
                                                x={p.x}
                                                y={p.y - 10}
                                                fill="white"
                                                fontSize="10"
                                                textAnchor="middle"
                                            >
                                                {Number(p.value).toFixed(2)}
                                            </text>
                                            </g>
                                        ))}
                                        </g>
                                ))}

                                {data.map((d, i) => {
                                    const x =
                                        data.length <= 1
                                            ? width / 2
                                            : padding + (i / (data.length - 1)) * (width - padding * 2);
                                    return (
                                        <text
                                            key={d.date + '-x'}
                                            x={x}
                                            y={height - 5}
                                            fill="white"
                                            fontSize="10"
                                            textAnchor="end"
                                        >
                                            {formatXLabel(d.date, range)}
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
                            className={`flex items-center gap-2 cursor-pointer ${
                            isActive ? '' : 'opacity-40'
                            }`}
                            onClick={() => {
                            setVisibleMacros(
                                isActive
                                ? visibleMacros.filter((m) => m !== k)
                                : [...visibleMacros, k]
                            );
                            }}
                        >
                            <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: c }}
                            />
                            <span>{k.toUpperCase()}</span>
                        </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    
    return (
        <main className="p-8">
            <h1 className="text-3xl mb-6">Stats Summary</h1>

            {macros && (
                <div className="mb-8">
                    <h2 className="text-2xl mb-4">Today's Nutrition Breakdown</h2>
                    {macros.carbs + macros.protein + macros.fat + macros.fibre === 0 ? (
                        <div className="p-4 text-center text-yellow-400">
                            Please enter a meal today to see your daily nutrient information
                        </div>
                    ) : (
                        <PieChart data={macros} size={250} />
                    )}
                </div>
            )}

            {/* Macro trends multi-line graph */}
            {renderMultiLineGraph(macroData, carbRange, 'Macronutrients Consumed (g)', setCarbRange, carbRange)}

            {/* Blood Glucose */}
            {renderGraph(bloodData, bloodRange, 'blood_glucose', 'Blood Glucose (mmol/L)', 'lightblue', setBloodRange, bloodRange)}

            {/* Insulin */}
            {renderGraph(insulinData, insulinRange, 'actual_insulin_taken', 'Insulin Taken (mL)', 'green', setInsulinRange, insulinRange)}
        </main>
    );
}

/* --------------------------- MACRO DATA HELPERS --------------------------- */
function buildMacroChartData(rows: TblUserFoodLog[], range: RangeType): MacroPoint[] {
    const now = new Date();
    const inRange = rows.filter(r => {
        const d = new Date(r.user_time);
        switch (range) {
            case 'daily':
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
            case 'weekly':
                return getWeek(d) === getWeek(now) && d.getFullYear() === now.getFullYear();
            case 'monthly':
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            case 'yearly':
                return d.getFullYear() === now.getFullYear();
        }
    });

    const buckets: Record<string, MacroPoint> = {};
    for (const r of inRange) {
        const d = new Date(r.user_time);
        let key = '';
        switch (range) {
            case 'daily':
                key = d.getTime().toString(); 
                break;
            case 'weekly':
                key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime().toString(); 
                break;
            case 'monthly':
                key = getWeek(d).toString(); 
                break;
            case 'yearly':
                key = (d.getMonth() + 1).toString(); 
                break;
        }
        if (!buckets[key]) buckets[key] = { date: key, carbs: 0, protein: 0, fat: 0, fibre: 0 };
        buckets[key].carbs   += Number(r.carb || 0);
        buckets[key].protein += Number(r.protein || 0);
        buckets[key].fat     += Number(r.fat || 0);
        buckets[key].fibre   += Number(r.fibre || 0);
    }
    return Object.values(buckets);
}

/* --- Pie Chart ------------------------------------------------------------ */
function PieChart({ data, size }: { data: MacroTotals; size: number }) {
    const total = data.carbs + data.protein + data.fat + data.fibre;
    const slices = [
        { label: 'Carbs', value: data.carbs, color: '#facc15' },
        { label: 'Protein', value: data.protein, color: '#4ade80' },
        { label: 'Fat', value: data.fat, color: '#fb7185' },
        { label: 'Fibre', value: data.fibre, color: '#60a5fa' },
    ];

    let cumulative = 0;
    const [hoverText, setHoverText] = useState<string | null>(null);

    const makeArc = (value: number) => {
        const start = cumulative;
        const angle = (value / total) * Math.PI * 2;
        cumulative += angle;
        return [start, cumulative];
    };

    const center = size / 2;
    const radius = center - 10;

    return (
        <div className="flex flex-col">
            <svg width={size} height={size}>
                {slices.map((slice, i) => {
                    const [start, end] = makeArc(slice.value);
                    const path = describeArc(center, center, radius, start, end);
                    return (
                        <path
                            key={i}
                            d={path}
                            fill={slice.color}
                            onMouseEnter={() => setHoverText(`${slice.label} - ${slice.value.toFixed(2)}g`)}
                            onMouseLeave={() => setHoverText(null)}
                        />
                    );
                })}
            </svg>
            {hoverText && <div className="text-white font-bold text-lg">{hoverText}</div>}
            <div className="flex gap-4 mt-4">
                {slices.map((slice, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <div style={{ backgroundColor: slice.color }} className="w-4 h-4 rounded-full" />
                        <span className="text-white text-sm">
                            {slice.label} ({slice.value.toFixed(2)}g)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* --- Helpers ------------------------------------------------------------ */
function buildChartData(
    events: TblUserEventLog[],
    key: 'net_carbs',
    range: RangeType
): { date: string; net_carbs: number }[];
function buildChartData(
    events: TblUserEventLog[],
    key: 'blood_glucose',
    range: RangeType
): { date: string; blood_glucose: number }[];
function buildChartData(
    events: TblUserEventLog[],
    key: 'actual_insulin_taken',
    range: RangeType
): { date: string; actual_insulin_taken: number }[];
function buildChartData(events: TblUserEventLog[], key: EventKey, range: RangeType) {
    const filteredEvents = events.filter((e) => typeof e[key] === 'number');
    const now = new Date();
    const inRange = filteredEvents.filter((e) => {
        const d = new Date(e.user_time);
        switch (range) {
            case 'daily':
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
            case 'weekly':
                return getWeek(d) === getWeek(now) && d.getFullYear() === now.getFullYear();
            case 'monthly':
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            case 'yearly':
                return d.getFullYear() === now.getFullYear();
        }
    });

    const grouped: Record<string, number> = {};
    for (const e of inRange) {
        const d = new Date(e.user_time);
        let keyStr = '';
        switch (range) {
            case 'daily':
                keyStr = d.getTime().toString();
                grouped[keyStr] = e[key]!;
                break;
            case 'weekly':
                keyStr = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime().toString();
                grouped[keyStr] = (grouped[keyStr] || 0) + e[key]!;
                break;
            case 'monthly':
                keyStr = `${getWeek(d)}`;
                grouped[keyStr] = (grouped[keyStr] || 0) + e[key]!;
                break;
            case 'yearly':
                keyStr = `${d.getMonth() + 1}`;
                grouped[keyStr] = (grouped[keyStr] || 0) + e[key]!;
                break;
        }
    }

    return Object.keys(grouped)
        .sort()
        .map((k) => {
            if (key === 'net_carbs') return { date: k, net_carbs: grouped[k] };
            if (key === 'blood_glucose') return { date: k, blood_glucose: grouped[k] };
            if (key === 'actual_insulin_taken') return { date: k, actual_insulin_taken: grouped[k] };
            throw new Error('Unknown key');
        });
}

function getWeek(d: Date): number {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0); // local instead of UTC
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function formatXLabel(key: string, range: RangeType) {
    switch (range) {
        case 'daily':
            return new Date(Number(key)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        case 'weekly':
            return new Date(Number(key)).toLocaleDateString();
        case 'monthly':
            return `Week ${key}`;
        case 'yearly':
            return `Month ${key}`;
    }
}

function buildTodayMacros(rows: TblUserFoodLog[]): MacroTotals {
    const isToday = (date: string | number) => {
        const d = new Date(date);
        const today = new Date();
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };
    const todayMeals = rows.filter((r) => r.user_time && isToday(r.user_time));

    return todayMeals.reduce(
        (acc, m) => ({
            carbs: acc.carbs + Number(m.carb || 0),
            protein: acc.protein + Number(m.protein || 0),
            fat: acc.fat + Number(m.fat || 0),
            fibre: acc.fibre + Number(m.fibre || 0),
        }),
        { carbs: 0, protein: 0, fat: 0, fibre: 0 }
    );
}

function polarToCartesian(cx: number, cy: number, r: number, rad: number) {
    return {
        x: cx + r * Math.cos(rad - Math.PI / 2),
        y: cy + r * Math.sin(rad - Math.PI / 2),
    };
}

function describeArc(x: number, y: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return ['M', x, y, 'L', start.x, start.y, 'A', r, r, 0, largeArc, 0, end.x, end.y, 'Z'].join(' ');
}
