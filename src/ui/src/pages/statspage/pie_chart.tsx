import {useState} from 'preact/hooks';
import {MacroTotals, Point2D, RangeTypeKeys, RangeType, NoInformationMessage} from './common';

const PolarToCartesian = (cx: number, cy: number, r: number, rad: number): Point2D => {
    return {
        x: cx + r * Math.cos(rad - Math.PI / 2),
        y: cy + r * Math.sin(rad - Math.PI / 2),
    };
};

const DescribeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number): string => {
    const start = PolarToCartesian(x, y, r, endAngle);
    const end = PolarToCartesian(x, y, r, startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return ['M', x, y, 'L', start.x, start.y, 'A', r, r, 0, largeArc, 0, end.x, end.y, 'Z'].join(' ');
};

type Props = {
    data: MacroTotals;
    size: number;
    range: RangeType;
    title: string;
    setRange: (r: RangeType) => void;
};
export const PieChart = ({title, data, size, range, setRange}: Props) => {
    const [hoverText, setHoverText] = useState<string | null>(null);

    const total = data.carbs + data.protein + data.fat + data.fibre;
    const slices = [
        {label: 'Carbs', value: data.carbs, color: '#facc15'},
        {label: 'Protein', value: data.protein, color: '#4ade80'},
        {label: 'Fat', value: data.fat, color: '#fb7185'},
        {label: 'Fibre', value: data.fibre, color: '#60a5fa'},
    ];

    let cumulative = 0;

    const makeArc = (value: number) => {
        const start = cumulative;
        const angle = (value / total) * Math.PI * 2;
        cumulative += angle;
        return [start, cumulative];
    };

    const center = size / 2;
    const radius = center - 10;

    return (
        <div className="flex flex-col my-8">
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

            {total === 0 ? (
                <div className="p-4 text-center text-yellow-400">{NoInformationMessage}</div>
            ) : (
                <>
                    <svg width={size} height={size}>
                        {slices.map((slice, i) => {
                            const [start, end] = makeArc(slice.value);
                            const path = DescribeArc(center, center, radius, start, end);
                            return (
                                <path
                                    key={i}
                                    d={path}
                                    fill={slice.color}
                                    onMouseEnter={() =>
                                        setHoverText(
                                            `${slice.label} - ${slice.value.toFixed(2)}g (${((slice.value / total) * 100).toFixed(1)}%)`
                                        )
                                    }
                                    onMouseLeave={() => setHoverText(null)}
                                />
                            );
                        })}
                    </svg>
                    {hoverText && <div className="text-white font-bold text-lg">{hoverText}</div>}
                    <div className="flex gap-4 mt-4">
                        {slices.map((slice, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <div style={{backgroundColor: slice.color}} className="w-4 h-4 rounded-full" />
                                <span className="text-white text-sm">
                                    {slice.label} {(slice.value / total * 100).toFixed(1)}{'% '} ({slice.value.toFixed(2)}g)
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
