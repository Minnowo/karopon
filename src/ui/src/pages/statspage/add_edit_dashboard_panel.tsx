import {Dispatch, StateUpdater, useState} from 'preact/hooks';
import {DashboardCard, EventLogType, MacroType} from './common';
import {TblUserBodyMetric, TblUserTag} from '../../api/types';
import {TagToString} from '../../utils/tags';
import {TagInput} from '../../components/tag_input';
import {BodyMetricMultiSelect} from './body_metric_multiselect';
import {MacroMultiSelect} from './macro_multiselect';
import {EventLogMultiSelect} from './eventlog_multiselect';

const CHART_LABELS: Record<DashboardCard['type'], string> = {
    macros: 'Macros / Calories',
    eventlogs: 'Blood Glucose / Insulin',
    bodylog: 'Body Metrics',
    time: 'Time Spent by Tag',
};

type DashboardSettingsPanelProps = {
    className?: string;
    titleLabel: string;
    initialName: string;
    confirmLabel: string;
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    bodyMetrics?: TblUserBodyMetric[];
    onConfirm: (name: string) => void;
    onDelete?: () => void;
    onCancel: () => void;
    onCardAdded?: (c: DashboardCard) => void;
};
export function AddEditDashboardPanel({
    className = 'mt-4 mb-4',
    titleLabel,
    initialName,
    confirmLabel,
    namespaces,
    setNamespaces,
    tagColors,
    bodyMetrics = [],
    onCardAdded,
    onConfirm,
    onDelete,
    onCancel,
}: DashboardSettingsPanelProps) {
    const [name, setName] = useState(initialName);
    const [addType, setAddType] = useState<DashboardCard['type']>('macros');
    const [tags, setTags] = useState<TblUserTag[]>([]);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [visibleMacros, setVisibleMacros] = useState<MacroType[]>(['fat', 'net_carbs', 'fibre', 'protein']);
    const [visibleEventLogs, setVisibleEventLogs] = useState<EventLogType[]>(['blood_glucose', 'actual_insulin_taken']);

    const addCard = () => {
        if (!onCardAdded) {
            return;
        }
        const card: DashboardCard = {
            id: 0,
            type: addType,
            title: CHART_LABELS[addType],
            visibleMacros: addType === 'macros' ? visibleMacros : [],
            visibleEventLogs: addType === 'eventlogs' ? visibleEventLogs : [],
            selectedTags: tags.map(TagToString),
            selectedMetrics,
        };

        onCardAdded(card);
    };

    return (
        <div className={`flex flex-col gap-2 p-2 surface-1 ${className}`}>
            <h2 className="text-lg font-bold">{titleLabel}</h2>
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    className="w-full px-2 py-1"
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder="View name"
                    aria-label="View name"
                />
            </div>

            {onCardAdded && (
                <div className="surface-2 flex flex-col gap-2">
                    <h2 className="text-lg font-bold">Add Chart</h2>
                    <div class="flex flex-row flex-wrap gap-2 items-center">
                        <select
                            className="px-2 py-1"
                            value={addType}
                            aria-label="Chart type"
                            onChange={(e) => setAddType((e.target as HTMLSelectElement).value as DashboardCard['type'])}
                        >
                            {(Object.keys(CHART_LABELS) as Array<DashboardCard['type']>).map((t) => (
                                <option key={t} value={t}>
                                    {CHART_LABELS[t]}
                                </option>
                            ))}
                        </select>
                        <button className="px-3 py-1 wsnw" onClick={addCard}>
                            + Add
                        </button>
                    </div>

                    {addType === 'time' && (
                        <div className="surface-3">
                            <h2 className="text-lg font-bold">Tags</h2>
                            <TagInput
                                namespaces={namespaces}
                                setNamespaces={setNamespaces}
                                thisTags={tags}
                                onChange={setTags}
                                tagColors={tagColors}
                            />
                        </div>
                    )}

                    {addType === 'macros' && (
                        <div className="surface-3">
                            <h2 className="text-lg font-bold">Macros / Calories</h2>
                            <MacroMultiSelect selected={visibleMacros} onChange={setVisibleMacros} />
                        </div>
                    )}

                    {addType === 'eventlogs' && (
                        <div className="surface-3">
                            <h2 className="text-lg font-bold">Blood Glucose / Insulin</h2>
                            <EventLogMultiSelect selected={visibleEventLogs} onChange={setVisibleEventLogs} />
                        </div>
                    )}

                    {addType === 'bodylog' && (
                        <div className="surface-3">
                            <h2 className="text-lg font-bold">Body Metrics</h2>
                            <BodyMetricMultiSelect
                                bodyMetrics={bodyMetrics}
                                selected={selectedMetrics}
                                onChange={setSelectedMetrics}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-wrap justify-between gap-2">
                {onDelete ? (
                    <button className="btn-error" onClick={onDelete}>
                        Delete
                    </button>
                ) : (
                    <div> </div>
                )}
                <div className="flex gap-2">
                    <button className="btn-error" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="btn-success" onClick={() => onConfirm(name)}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
