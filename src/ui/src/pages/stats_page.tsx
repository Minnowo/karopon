import {BaseState} from '../state/basestate';
import {useEffect, useState} from 'preact/hooks';
import {TblUserEventLog, TblUserFoodLog} from '../api/types';
import {GetUserFoodLog} from '../api/api';

type RangeType = 'daily' | 'weekly' | 'monthly' | 'yearly';

type MacroTotals = {
    carbs: number;
    protein: number;
    fat: number;
    fibre: number;
};

export function StatsPage(state: BaseState) {
    const [foodLogs, setFoodLogs] = useState<TblUserFoodLog[] | null>(null);
    const [range, setRange] = useState<RangeType>('daily');
    const [chartData, setChartData] = useState<{date: string; carbs: number}[]>([]);
    const [macros, setMacros] = useState<MacroTotals | null>(null);

    useEffect(() => {
        GetUserFoodLog().then((data) => setFoodLogs(data));
    }, []);

    useEffect(() => {
        if (state.eventlog !== null) {
            setChartData(buildRangeData(state.eventlog, range));
        }
    }, [state.eventlog, range]);

    useEffect(() => {
        if (foodLogs) {
            setMacros(buildTodayMacros(foodLogs));
        }
    }, [foodLogs]);

    const width = 600;
    const height = 300;
    const padding = 40;

    const maxCarbs = Math.max(...chartData.map((d) => d.carbs), 10);

    const points =
        chartData.length <= 1
            ? chartData.map((d) => ({
                  x: width / 2,
                  y: height / 2,
                  carbs: d.carbs,
                  date: d.date,
              }))
            : chartData.map((d, i) => {
                  const rawX = padding + (i / (chartData.length - 1)) * (width - padding * 2);
                  const x = Math.max(padding, Math.min(width - padding, rawX));
                  const y = height - padding - (d.carbs / maxCarbs) * (height - padding * 2);
                  return {x, y, carbs: d.carbs, date: d.date};
              });

    return (
        <main className="p-8">
            <h1 className="text-2xl mb-6">Carbohydrate Stats</h1>

            <div className="flex gap-4 mb-4">
                {['daily', 'weekly', 'monthly', 'yearly'].map((r) => (
                    <button
                        key={r}
                        className={`px-3 py-1 border rounded ${range === r ? 'bg-c-yellow text-black' : 'bg-c-d-black'}`}
                        onClick={() => setRange(r as RangeType)}
                    >
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width + 50} ${height}`}
                preserveAspectRatio="xMinYMin meet"
                className="border border-c-yellow rounded mb-4"
            >
                <polyline fill="none" stroke="white" strokeWidth="2" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
                {points.map((p) => (
                    <g key={p.date}>
                        <circle cx={p.x} cy={p.y} r="5" fill="yellow" />
                        <text x={p.x} y={p.y - 10} fill="white" fontSize="10" textAnchor="middle">
                            {p.carbs}
                        </text>
                    </g>
                ))}
                {points.map((p) => (
                    <text
                        key={`${p.date}-x`}
                        x={p.x}
                        y={height - 5}
                        fill="white"
                        fontSize="10"
                        textAnchor="end"
                        transform={`rotate(-45 ${p.x},${height - 5})`}
                    >
                        {formatXLabel(p.date, range)}
                    </text>
                ))}
            </svg>
            {macros && (
                <>
                    <h1 className="text-2xl mb-6">Today's Nutrition Breakdown</h1>
                    {macros.carbs + macros.protein + macros.fat + macros.fibre === 0 ? (
                        <div className="p-4 text-center text-yellow-400">
                            Please enter a meal today to see your daily nutrient information
                        </div>
                    ) : (
                        <PieChart data={macros} size={250} />
                    )}
                </>
            )}
        </main>
    );
}

/* --- Pie Chart ------------------------------------------------------------ */
function PieChart({data, size}: {data: MacroTotals; size: number}) {
    const total = data.carbs + data.protein + data.fat + data.fibre;

    const slices = [
        {label: 'Carbs', value: data.carbs, color: '#facc15'},
        {label: 'Protein', value: data.protein, color: '#4ade80'},
        {label: 'Fat', value: data.fat, color: '#fb7185'},
        {label: 'Fibre', value: data.fibre, color: '#60a5fa'},
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

            {/* Display hover text next to the chart */}
            {hoverText && <div className="text-white font-bold text-lg">{hoverText}</div>}

            {/* Legend */}
            <div className="flex gap-4 mt-4">
                {slices.map((slice, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <div style={{backgroundColor: slice.color}} className="w-4 h-4 rounded-full" />
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
        {carbs: 0, protein: 0, fat: 0, fibre: 0}
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
function buildRangeData(events: TblUserEventLog[], range: RangeType) {
    const carbEvents = events.filter((e) => typeof e.net_carbs === 'number');
    const now = new Date();

    // Filter by current period
    const filtered = carbEvents.filter((e) => {
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

    for (const e of filtered) {
        const d = new Date(e.user_time);
        let key = '';

        switch (range) {
            case 'daily':
                key = d.toISOString(); // show each event
                grouped[key] = e.net_carbs;
                break;
            case 'weekly':
                key = d.toISOString().split('T')[0]; // sum per day
                grouped[key] = (grouped[key] || 0) + e.net_carbs;
                break;
            case 'monthly':
                key = `${getWeek(d)}`; // sum per week
                grouped[key] = (grouped[key] || 0) + e.net_carbs;
                break;
            case 'yearly':
                key = `${d.getMonth() + 1}`; // sum per month
                grouped[key] = (grouped[key] || 0) + e.net_carbs;
                break;
        }
    }

    return Object.keys(grouped)
        .sort()
        .map((k) => ({date: k, carbs: grouped[k]}));
}

function getWeek(d: Date): number {
    const date = new Date(d.getTime());
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function formatXLabel(key: string, range: RangeType) {
    switch (range) {
        case 'daily':
            return new Date(key).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        case 'weekly':
            return key; // show day
        case 'monthly':
            return `Week ${key}`;
        case 'yearly':
            return `Month ${key}`;
    }
}
