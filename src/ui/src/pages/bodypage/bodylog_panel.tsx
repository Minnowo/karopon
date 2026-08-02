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
        <span className="">{label}</span>
        <span className="font-medium">{value}</span>
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
        <div className="w-full p-3 border rounded container-theme">
            <div className="flex flex-row flex-wrap w-full justify-between align-middle">
                <span />
                <div className="text-center font-semibold">{FormatSmartTimestamp(bodyLog.bodylog.user_time)}</div>
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
                <div className="text-sm text-faded py-2">No metrics recorded</div>
            ) : (
                <div className="rounded border p-2 divide-y">
                    {rows.map((r) => (
                        <Metric key={r.metric!.id} label={r.metric!.name} value={`${r.value.value} ${r.metric!.unit}`} />
                    ))}
                </div>
            )}
        </div>
    );
}
