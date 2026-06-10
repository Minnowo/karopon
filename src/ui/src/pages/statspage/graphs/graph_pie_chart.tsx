import {useMemo, useState} from 'preact/hooks';
import {Point2D, NoInformationMessage, GraphStyle} from '../common';
import {BaseGraphProps} from './common_props';
import {GroupBy} from '../../../api/types_stats';

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

export type PieChartProps = BaseGraphProps & {
    graphStyle?: GraphStyle;
    onGraphStyleChange?: (s: GraphStyle) => void;

    size: number;
};

export const PieChart = ({
    size,

    data,
    title,
    timeRanges,
    onTimeRangeChange,

    curTimeRange,

    precision = 1,
}: PieChartProps) => {
    const [hoverText, setHoverText] = useState<string | null>(null);

    const slices = useMemo(
        () =>
            data.labels.map((label, i) => {
                let value = 0;
                for (const row of data.rows) {
                    value += row.y[i] ?? 0;
                }
                return {label, value, color: data.colors[i]};
            }),
        [data]
    );

    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

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
        <div className="flex flex-col">
            <h1 className="text-2xl mb-2">{title}</h1>
            <div className="flex flex-row flex-wrap justify-between">
                <div className="flex gap-2 mb-4">
                    <select
                        className={`px-3 py-1`}
                        value={curTimeRange}
                        onInput={(e) => onTimeRangeChange(Number((e.target as HTMLSelectElement).value))}
                    >
                        {timeRanges &&
                            timeRanges.map((x, i) => (
                                <option key={x.name} value={i}>
                                    {x.name}
                                </option>
                            ))}
                    </select>
                </div>
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
                    {hoverText && <div className="text-c-text font-bold text-lg">{hoverText}</div>}
                    <div className="flex gap-4 mt-4 flex-wrap">
                        {slices.map((slice, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <div style={{backgroundColor: slice.color}} className="w-4 h-4 rounded-full" />
                                <span className="text-sm">
                                    {slice.label} {((slice.value / total) * 100).toFixed(1)}
                                    {'% '} {slice.value.toFixed(precision)}g
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
