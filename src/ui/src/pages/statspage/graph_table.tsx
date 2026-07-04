import {GraphStyleKeys, NoInformationMessage} from './common';
import {FormatXLabel, BaseGraphProps} from './graph';
import {GroupBy} from '../../api/types_stats';

const SUM_ROW_KEY = '${SUM}';
const SUM_ROW_LABEL = 'Sum';

export function TableGraph2({
    data,
    title,

    timeRanges,
    onTimeRangesChange,

    curTimeRange,
    onTimeRangeChange,

    groupBy,
    onGroupByChange,

    aggregationFunc,
    onAggregationFunc,

    hiddenLabels,
    onHiddenLabelsChange,
    precision = 1,
    graphStyle,
    onGraphStyleChange,
}: BaseGraphProps) {
    const visibleCols = data.labels
        .map((label, index) => ({label, index}))
        .filter(({label}) => !hiddenLabels.includes(label))
        .map(({index}) => index);

    const showSumRow = visibleCols.length >= 2 && !hiddenLabels.includes(SUM_ROW_KEY);

    return (
        <div className="w-full">
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
                <div className="flex gap-2 mb-4">
                    <select
                        className={`px-3 py-1`}
                        value={groupBy}
                        onInput={(e) => onGroupByChange((e.target as HTMLSelectElement).value as GroupBy)}
                    >
                        {Object.values(GroupBy).map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </div>
                {onGraphStyleChange && (
                    <div className="flex gap-2 mb-4">
                        {GraphStyleKeys.map((s) => (
                            <button
                                key={s}
                                className={`px-3 py-1 border rounded ${graphStyle === s ? 'bg-c-yellow text-c-crust' : 'text-c-text'}`}
                                onClick={() => onGraphStyleChange(s)}
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {data.rows.length === 0 ? (
                <div className="p-4 text-center text-yellow-400">{NoInformationMessage}</div>
            ) : (
                <>
                    <div className="overflow-x-auto border border-c-yellow rounded">
                        <table className="border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 bg-c-mantle px-3 py-1 text-left border-b border-c-overlay1" />
                                    {data.rows.map((row) => (
                                        <th
                                            key={row.x}
                                            className="px-3 py-1 text-right border-b border-c-overlay1 whitespace-nowrap"
                                        >
                                            {FormatXLabel(row.x, groupBy)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {showSumRow && (
                                    <tr>
                                        <th className="sticky left-0 bg-c-mantle px-3 py-1 text-left whitespace-nowrap">
                                            {SUM_ROW_LABEL}
                                        </th>
                                        {data.rows.map((row) => {
                                            const sum = visibleCols.reduce((acc, key) => acc + (row.y[key] ?? 0), 0);
                                            return (
                                                <td key={row.x} className="px-3 py-1 text-right whitespace-nowrap">
                                                    {sum.toFixed(precision)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                                {visibleCols.map((key) => (
                                    <tr key={key}>
                                        <th
                                            className="sticky left-0 bg-c-mantle px-3 py-1 text-left whitespace-nowrap"
                                            style={{color: data.colors[key]}}
                                        >
                                            {data.labels[key]}
                                        </th>
                                        {data.rows.map((row) => (
                                            <td key={row.x} className="px-3 py-1 text-right whitespace-nowrap">
                                                {(row.y[key] ?? 0).toFixed(precision)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3">
                        {data.labels.length >= 2 &&
                            (() => {
                                const isActive = !hiddenLabels.includes(SUM_ROW_KEY);
                                return (
                                    <div
                                        className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                                        onClick={() =>
                                            onHiddenLabelsChange(
                                                isActive
                                                    ? [...hiddenLabels, SUM_ROW_KEY]
                                                    : hiddenLabels.filter((v) => v !== SUM_ROW_KEY)
                                            )
                                        }
                                    >
                                        <div className="w-4 h-4 rounded-sm border border-current" />
                                        <span>{SUM_ROW_LABEL}</span>
                                    </div>
                                );
                            })()}
                        {data.labels.map((k, i) => {
                            const isActive = !hiddenLabels.includes(k);
                            return (
                                <div
                                    key={k}
                                    className={`flex items-center gap-2 cursor-pointer ${isActive ? '' : 'opacity-40'}`}
                                    onClick={() =>
                                        onHiddenLabelsChange(
                                            isActive ? [...hiddenLabels, k] : hiddenLabels.filter((v) => v !== k)
                                        )
                                    }
                                >
                                    <div className="w-4 h-4 rounded-sm" style={{backgroundColor: data.colors[i]}} />
                                    <span>{k}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
