import {useState, useMemo} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {TblUserBodyMetric, UserBodyLog} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {JSX} from 'preact';

type AddBodyPanelProps = {
    bodylog: UserBodyLog;
    bodyMetrics: TblUserBodyMetric[];
    onCreate: (bodylog: UserBodyLog) => void;
    onCancel: () => void;
    title: string;
    saveButtonTitle: string;
    preserveTime?: boolean;
    actionButtons?: JSX.Element[];
    className?: string;
};

export function AddBodyPanel({
    bodylog,
    bodyMetrics,
    onCreate,
    onCancel,
    title,
    saveButtonTitle,
    preserveTime = false,
    className = '',
}: AddBodyPanelProps) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const render = DoRender();

    const tmpLog = useMemo<UserBodyLog>(
        () => ({
            bodylog: {
                ...bodylog.bodylog,
                created: Date.now(),
                user_time: preserveTime ? bodylog.bodylog.user_time : Date.now(),
            },
            metrics: [...bodylog.metrics],
        }),
        [bodylog, preserveTime]
    );

    const sortedMetrics = useMemo(() => [...bodyMetrics].sort((a, b) => a.name.localeCompare(b.name)), [bodyMetrics]);

    const valueForMetric = (metricID: number): number => tmpLog.metrics.find((m) => m.body_metric_id === metricID)?.value ?? 0;

    const setValueForMetric = (metricID: number, value: number) => {
        const existing = tmpLog.metrics.find((m) => m.body_metric_id === metricID);
        if (existing) {
            existing.value = value;
        } else {
            tmpLog.metrics.push({bodylog_id: tmpLog.bodylog.id, body_metric_id: metricID, value});
        }
        render();
    };

    const doSave = () => {
        setErrorMsg(null);

        const newLog: UserBodyLog = {
            bodylog: tmpLog.bodylog,
            metrics: tmpLog.metrics.filter((m) => m.value !== 0),
        };

        onCreate(newLog);
    };

    return (
        <>
            <div className={`surface-1 flex flex-col gap-4 ${className}`}>
                <h2>{title}</h2>

                <ErrorDiv errorMsg={errorMsg} />

                <div className="flex flex-col gap-2 justify-between">
                    <div className="flex flex-col gap-2">
                        {sortedMetrics.length === 0 ? (
                            <small>
                                No body metrics defined yet. Add some from the <a href="#body-metrics">Body Metrics</a> page.
                            </small>
                        ) : (
                            sortedMetrics.map((metric) => (
                                <NumberInput
                                    key={metric.id}
                                    className="flex-1"
                                    innerClassName="flex-1 min-w-0"
                                    label={metric.unit ? `${metric.name} (${metric.unit})` : metric.name}
                                    step={1}
                                    precision={3}
                                    value={valueForMetric(metric.id)}
                                    onValueChange={(v) => setValueForMetric(metric.id, v)}
                                />
                            ))
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button onClick={onCancel}>Cancel</button>
                        <button className="btn-success" onClick={doSave}>
                            {saveButtonTitle}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
