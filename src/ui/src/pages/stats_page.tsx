import { useEffect, useState } from "preact/hooks";
import { TblUserEventLog } from "../api/types";
import { GetUserEventLog } from "../api/api";

type RangeType = "daily" | "weekly" | "monthly" | "yearly";

export function StatsPage(state: any) {
    const [eventLogs, setEventLogs] = useState<TblUserEventLog[] | null>(null);
    const [range, setRange] = useState<RangeType>("daily");
    const [chartData, setChartData] = useState<{ date: string; carbs: number }[]>([]);

    useEffect(() => {
        GetUserEventLog().then((data) => setEventLogs(data));
    }, []);

    useEffect(() => {
        if (eventLogs !== null) {
            setChartData(buildRangeData(eventLogs, range));
        }
    }, [eventLogs, range]);

    if (eventLogs === null) return <div className="p-4">Loading...</div>;

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
                  return { x, y, carbs: d.carbs, date: d.date };
              });

    return (
        <main className="p-8">
            <h1 className="text-2xl mb-6">Carbohydrate Stats</h1>

            <div className="flex gap-4 mb-4">
                {["daily", "weekly", "monthly", "yearly"].map((r) => (
                    <button
                        key={r}
                        className={`px-3 py-1 border rounded ${
                            range === r ? "bg-c-yellow text-black" : "bg-c-d-black"
                        }`}
                        onClick={() => setRange(r as RangeType)}
                    >
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            <svg width={width} height={height} viewBox={`0 0 ${width + 50} ${height}`} preserveAspectRatio="xMinYMin meet" className="border border-c-yellow rounded">
                <polyline
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                />
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
                        key={p.date + "-x"}
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
        </main>
    );
}

/* --- Helpers ------------------------------------------------------------ */

function buildRangeData(events: TblUserEventLog[], range: RangeType) {
    const carbEvents = events.filter((e) => typeof e.net_carbs === "number");
    const now = new Date();

    // Filter by current period
    const filtered = carbEvents.filter((e) => {
        const d = new Date(e.user_time);
        switch (range) {
            case "daily":
                return (
                    d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate()
                );
            case "weekly":
                return getWeek(d) === getWeek(now) && d.getFullYear() === now.getFullYear();
            case "monthly":
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            case "yearly":
                return d.getFullYear() === now.getFullYear();
        }
    });

    const grouped: Record<string, number> = {};

    for (const e of filtered) {
        const d = new Date(e.user_time);
        let key = "";

        switch (range) {
            case "daily":
                key = d.toISOString(); // show each event
                grouped[key] = e.net_carbs;
                break;
            case "weekly":
                key = d.toISOString().split("T")[0]; // sum per day
                grouped[key] = (grouped[key] || 0) + e.net_carbs;
                break;
            case "monthly":
                key = `${getWeek(d)}`; // sum per week
                grouped[key] = (grouped[key] || 0) + e.net_carbs;
                break;
            case "yearly":
                key = `${d.getMonth() + 1}`; // sum per month
                grouped[key] = (grouped[key] || 0) + e.net_carbs;
                break;
        }
    }

    return Object.keys(grouped)
        .sort()
        .map((k) => ({ date: k, carbs: grouped[k] }));
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
        case "daily":
            return new Date(key).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        case "weekly":
            return key; // show day
        case "monthly":
            return `Week ${key}`;
        case "yearly":
            return `Month ${key}`;
    }
}
