import {useMemo} from 'preact/hooks';
import {TblUserBodyMetric, UserBodyLog} from '../../api/types';
import {FormatSmartTimestamp} from '../../utils/date_utils';
import {DropdownButton} from '../../components/drop_down_button';

type BodyLogPanelProps = {
    bodyLog: UserBodyLog;
    bodyMetrics: TblUserBodyMetric[];
    onCopy: (log: UserBodyLog) => void;
    onEdit: (log: UserBodyLog) => void;
    onDelete: (log: UserBodyLog) => void;
};

const Metric = ({label, value}: {label: string; value: string}) => (
    <div className="flex flex-wrap justify-between py-1 text-sm">
        <span>{label}</span>
        <span>{value}</span>
    </div>
);

export function BodyLogPanel({bodyLog, bodyMetrics, onCopy, onEdit, onDelete}: BodyLogPanelProps) {
    const metricByID = useMemo(() => new Map(bodyMetrics.map((m) => [m.id, m])), [bodyMetrics]);

    const rows = useMemo(
        () =>
            bodyLog.metrics
                .map((v) => ({value: v, metric: metricByID.get(v.body_metric_id)}))
                .filter((r) => r.metric !== undefined)
                .sort((a, b) => a.metric!.name.localeCompare(b.metric!.name)),
        [bodyLog.metrics, metricByID]
    );

    return (
        <div className="w-full surface-1 flex flex-col gap-2">
            <div className="flex flex-row flex-wrap w-full justify-between items-center">
                <span />
                <h4 className="text-center">{FormatSmartTimestamp(bodyLog.bodylog.user_time)}</h4>
                <DropdownButton
                    actions={[
                        {
                            label: 'Copy',
                            onClick: () => onCopy(bodyLog),
                        },
                        {label: 'Edit', onClick: () => onEdit(bodyLog)},
                        {
                            label: 'Delete',
                            dangerous: true,
                            onClick: () => onDelete(bodyLog),
                        },
                    ]}
                />
            </div>

            {rows.length === 0 ? (
                <small>No metrics recorded</small>
            ) : (
                <div className="surface-2 divide-y divide-c-outline-variant">
                    {rows.map((r) => (
                        <Metric key={r.metric!.id} label={r.metric!.name} value={`${r.value.value} ${r.metric!.unit}`} />
                    ))}
                </div>
            )}
        </div>
    );
}
