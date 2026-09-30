import {Dispatch, StateUpdater, useState} from 'preact/hooks';
import {CommonRanges, DashboardCard, TimeRange, TimeUnit} from './common';
import {TblUserBodyMetric} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {SplitTag, TagToString} from '../../utils/tags';
import {TagInput} from '../../components/tag_input';
import {TimeRangeInput} from '../../components/timerange_input';
import {ParseRelativeTimeExpr} from '../../utils/timerange';
import {FormatSmartTimestamp2} from '../../utils/date_utils';
import {DropdownButton} from '../../components/drop_down_button';
import {BodyMetricMultiSelect} from './body_metric_multiselect';
import {MacroMultiSelect} from './macro_multiselect';
import {EventLogMultiSelect} from './eventlog_multiselect';
import {ErrorDiv} from '../../components/error_div';

type TimeRangePanelProps = {
    range: TimeRange;
    dayOffsetSeconds: number;
    canRemove: boolean;
    isFirst: boolean;
    isLast: boolean;
    expanded: boolean;
    onToggleExpand: () => void;
    onChange: (range: TimeRange) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDuplicate: () => void;
};

// Edits land straight on the chart's draft - the card editor's single Cancel/Save
// covers them, so this has no buttons of its own.
function TimeRangePanel({
    range,
    dayOffsetSeconds,
    canRemove,
    isFirst,
    isLast,
    expanded,
    onToggleExpand,
    onChange,
    onRemove,
    onMoveUp,
    onMoveDown,
    onDuplicate,
}: TimeRangePanelProps) {
    const now = new Date();

    return (
        <div className="flex flex-col gap-2 py-2">
            <div className="flex flex-row items-center gap-2">
                <button
                    className="px-2"
                    onClick={onToggleExpand}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Close time range' : 'Edit time range'}
                >
                    {expanded ? '▾' : '▸'}
                </button>
                <h5 className="flex-1 wsnw overflow-hidden text-ellipsis">{range.name}</h5>
                <DropdownButton
                    actions={[
                        {label: expanded ? 'Close' : 'Edit', onClick: onToggleExpand},
                        {label: 'Move Up', disabled: isFirst, onClick: onMoveUp},
                        {label: 'Move Down', disabled: isLast, onClick: onMoveDown},
                        {label: 'Duplicate', onClick: onDuplicate},
                        {label: 'Delete', dangerous: true, disabled: !canRemove, onClick: onRemove},
                    ]}
                />
            </div>

            {expanded && (
                <div className="surface-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <label>Name</label>
                        <input
                            className="w-full"
                            type="text"
                            value={range.name}
                            onInput={(e) => onChange({...range, name: (e.target as HTMLInputElement).value})}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label>Start Time</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                            <TimeRangeInput range={range.rangeStart} onChange={(v) => onChange({...range, rangeStart: v})} />
                            <span className="flex w-full justify-center text-center sm:text-left">
                                {FormatSmartTimestamp2(ParseRelativeTimeExpr(range.rangeStart, now, dayOffsetSeconds / 1000))}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label>End Time</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                            <TimeRangeInput range={range.rangeEnd} onChange={(v) => onChange({...range, rangeEnd: v})} />
                            <span className="flex w-full justify-center text-center sm:text-left">
                                {FormatSmartTimestamp2(ParseRelativeTimeExpr(range.rangeEnd, now, dayOffsetSeconds / 1000))}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label>Group By</label>
                        <select
                            value={range.groupBy}
                            aria-label="Group by"
                            onInput={(e) => onChange({...range, groupBy: (e.target as HTMLSelectElement).value as GroupBy})}
                        >
                            {Object.values(GroupBy).map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label>Aggregation</label>
                        <select
                            value={range.aggregationFunc}
                            aria-label="Aggregation function"
                            onInput={(e) =>
                                onChange({...range, aggregationFunc: (e.target as HTMLSelectElement).value as AggregationFunc})
                            }
                        >
                            {Object.values(AggregationFunc).map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

type DashboardCardEditorProps = {
    draft: DashboardCard;
    onDraftChange: (card: DashboardCard) => void;
    dayOffsetSeconds: number;
    bodyMetrics: TblUserBodyMetric[];
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    isDirty: boolean;
    saving: boolean;
    saveError: string | null;
    onSave: () => void;
    onCancel: () => void;
};

export function DashboardCardEditor({
    draft,
    onDraftChange,
    dayOffsetSeconds,
    bodyMetrics,
    namespaces,
    setNamespaces,
    tagColors,
    isDirty,
    saving,
    saveError,
    onSave,
    onCancel,
}: DashboardCardEditorProps) {
    const [expandedRangeIndex, setExpandedRangeIndex] = useState<number | null>(null);
    const [addTemplateKey, setAddTemplateKey] = useState<string>('default-0');

    const timeRanges = draft.timeRanges && draft.timeRanges.length > 0 ? draft.timeRanges : CommonRanges;

    // curTimeRange indexes into timeRanges, so it has to stay in bounds whenever
    // the list shrinks.
    const setTimeRanges = (next: TimeRange[]) => {
        onDraftChange({
            ...draft,
            timeRanges: next,
            curTimeRange: Math.max(0, Math.min(draft.curTimeRange ?? 0, next.length - 1)),
        });
    };

    const handleAddTimeRange = () => {
        const [group, idxStr] = addTemplateKey.split('-');
        const idx = Number(idxStr);
        const template = group === 'current' ? timeRanges[idx] : CommonRanges[idx];

        const newRange: TimeRange = template
            ? {...template, name: `${template.name} Copy`}
            : {
                  name: 'New Range',
                  rangeStart: 'now-24h',
                  rangeEnd: 'now',
                  groupBy: GroupBy.Minute,
                  aggregationFunc: AggregationFunc.Sum,
              };

        setTimeRanges([...timeRanges, newRange]);
        setExpandedRangeIndex(timeRanges.length);
    };

    const handleRemoveTimeRange = (index: number) => {
        setTimeRanges(timeRanges.filter((_, i) => i !== index));
        setExpandedRangeIndex((cur) => (cur === null ? null : cur === index ? null : cur > index ? cur - 1 : cur));
    };

    const handleMoveTimeRangeUp = (index: number) => {
        if (index <= 0) {
            return;
        }
        const next = [...timeRanges];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        setTimeRanges(next);
        setExpandedRangeIndex((cur) => (cur === index ? index - 1 : cur === index - 1 ? index : cur));
    };

    const handleMoveTimeRangeDown = (index: number) => {
        if (index >= timeRanges.length - 1) {
            return;
        }
        const next = [...timeRanges];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        setTimeRanges(next);
        setExpandedRangeIndex((cur) => (cur === index ? index + 1 : cur === index + 1 ? index : cur));
    };

    const handleDuplicateTimeRange = (index: number) => {
        const insertAt = index + 1;
        const duplicate: TimeRange = {...timeRanges[index], name: `${timeRanges[index].name} Copy`};
        setTimeRanges([...timeRanges.slice(0, insertAt), duplicate, ...timeRanges.slice(insertAt)]);
        setExpandedRangeIndex(insertAt);
    };

    const handleTimeRangeChange = (index: number, updated: TimeRange) => {
        setTimeRanges(timeRanges.map((r, i) => (i === index ? updated : r)));
    };

    return (
        <div className="flex flex-col gap-4">
            <h3>Edit Chart</h3>

            <ErrorDiv errorMsg={saveError} />

            <div className="flex flex-col gap-1">
                <label>Title</label>
                <input
                    className="w-full"
                    value={draft.title}
                    aria-label="Card title"
                    onInput={(e) => onDraftChange({...draft, title: (e.target as HTMLInputElement).value})}
                />
            </div>

            {draft.type === 'time' && (
                <div className="flex flex-col gap-2">
                    <h4>Tags</h4>
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        thisTags={draft.selectedTags.map(SplitTag)}
                        onChange={(tags) => onDraftChange({...draft, selectedTags: tags.map(TagToString)})}
                        tagColors={tagColors}
                    />
                    <div className="flex flex-col gap-1">
                        <label>Time Unit</label>
                        <select
                            value={draft.timeUnit ?? 'hours'}
                            aria-label="Time unit"
                            onInput={(e) =>
                                onDraftChange({...draft, timeUnit: (e.target as HTMLSelectElement).value as TimeUnit})
                            }
                        >
                            <option value="hours">Hours</option>
                            <option value="minutes">Minutes</option>
                            <option value="days">Days</option>
                            <option value="mixed">Mixed (1d 3h 23m)</option>
                        </select>
                    </div>
                </div>
            )}

            {draft.type === 'bodylog' && (
                <div className="flex flex-col gap-2">
                    <h4>Body Metrics</h4>
                    <BodyMetricMultiSelect
                        bodyMetrics={bodyMetrics}
                        selected={draft.selectedMetrics ?? []}
                        onChange={(selectedMetrics) => onDraftChange({...draft, selectedMetrics})}
                    />
                </div>
            )}

            {draft.type === 'macros' && (
                <div className="flex flex-col gap-2">
                    <h4>Macros / Calories</h4>
                    <MacroMultiSelect
                        selected={draft.visibleMacros ?? []}
                        onChange={(visibleMacros) => onDraftChange({...draft, visibleMacros})}
                    />
                </div>
            )}

            {draft.type === 'eventlogs' && (
                <div className="flex flex-col gap-2">
                    <h4>Blood Glucose / Insulin</h4>
                    <EventLogMultiSelect
                        selected={draft.visibleEventLogs ?? []}
                        onChange={(visibleEventLogs) => onDraftChange({...draft, visibleEventLogs})}
                    />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <h4>Time Ranges</h4>
                <div class="flex flex-row flex-wrap gap-2 items-center">
                    <select
                        className="px-2 py-1"
                        value={addTemplateKey}
                        aria-label="Add from template"
                        onChange={(e) => setAddTemplateKey((e.target as HTMLSelectElement).value)}
                    >
                        <optgroup label="Defaults">
                            {CommonRanges.map((r, i) => (
                                <option key={`default-${i}`} value={`default-${i}`}>
                                    {r.name}
                                </option>
                            ))}
                        </optgroup>
                        {timeRanges.length > 0 && (
                            <optgroup label="Current">
                                {timeRanges.map((r, i) => (
                                    <option key={`current-${i}`} value={`current-${i}`}>
                                        {r.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    <button className="btn-outlined-success wsnw" onClick={handleAddTimeRange}>
                        + Add
                    </button>
                </div>
                <div className="flex flex-col gap-1">
                    {timeRanges.map((r, i) => (
                        <div key={i}>
                            <TimeRangePanel
                                range={r}
                                dayOffsetSeconds={dayOffsetSeconds}
                                canRemove={timeRanges.length > 1}
                                isFirst={i === 0}
                                isLast={i === timeRanges.length - 1}
                                expanded={expandedRangeIndex === i}
                                onToggleExpand={() => setExpandedRangeIndex((cur) => (cur === i ? null : i))}
                                onChange={(updated) => handleTimeRangeChange(i, updated)}
                                onRemove={() => handleRemoveTimeRange(i)}
                                onMoveUp={() => handleMoveTimeRangeUp(i)}
                                onMoveDown={() => handleMoveTimeRangeDown(i)}
                                onDuplicate={() => handleDuplicateTimeRange(i)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <h4>Other Options</h4>
                <label
                    className="flex items-center gap-2 cursor-pointer"
                    title="If chart data should come from the server or only in-memory. If using large time ranges, this is recommended."
                >
                    <input
                        type="checkbox"
                        checked={draft.useNetwork}
                        onChange={(e) => onDraftChange({...draft, useNetwork: e.currentTarget.checked})}
                    />
                    <span>Use Network Data</span>
                </label>
                <label
                    className="flex items-center gap-2 cursor-pointer"
                    title="Don't show the numeric value text for data points that are 0."
                >
                    <input
                        type="checkbox"
                        checked={draft.hideZeroValues ?? false}
                        onChange={(e) => onDraftChange({...draft, hideZeroValues: e.currentTarget.checked})}
                    />
                    <span>Hide Zero Values</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Don't show any numeric value text on the chart.">
                    <input
                        type="checkbox"
                        checked={draft.hideValueLabels ?? false}
                        onChange={(e) => onDraftChange({...draft, hideValueLabels: e.currentTarget.checked})}
                    />
                    <span>Hide Value Labels</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Show a Y-axis with approximate values.">
                    <input
                        type="checkbox"
                        checked={draft.showYAxis ?? false}
                        onChange={(e) => onDraftChange({...draft, showYAxis: e.currentTarget.checked})}
                    />
                    <span>Show Y-Axis</span>
                </label>
            </div>

            <div className="flex justify-end gap-2">
                <button onClick={onCancel} disabled={saving}>
                    Cancel
                </button>
                <button className="btn-success" onClick={onSave} disabled={saving || !isDirty}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}
