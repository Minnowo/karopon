import {useState, useMemo, useEffect} from 'preact/hooks';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {EditorDialog} from '../../components/editor_dialog';
import {ApiError} from '../../api/api';
import {DoRender} from '../../hooks/doRender';
import {TblUserBodyMetric, UserBodyLog} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {JSX} from 'preact';

type AddBodyPanelProps = {
    bodylog: UserBodyLog;
    bodyMetrics: TblUserBodyMetric[];
    // Saves the body log; rejects with an ApiError when the server refuses it.
    onCreate: (bodylog: UserBodyLog) => Promise<void>;
    onCancel: () => void;
    title: string;
    saveButtonTitle: string;
    preserveTime?: boolean;
    actionButtons?: JSX.Element[];
};

export function AddBodyPanel({
    bodylog,
    bodyMetrics,
    onCreate,
    onCancel,
    title,
    saveButtonTitle,
    preserveTime = false,
}: AddBodyPanelProps) {
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [saving, setSaving] = useState<boolean>(false);

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

    // A different starting body log (e.g. Copy while the panel is open) makes an old alert meaningless.
    useEffect(() => {
        setErrorMsg(null);
    }, [bodylog]);

    const sortedMetrics = useMemo(() => [...bodyMetrics].sort((a, b) => a.name.localeCompare(b.name)), [bodyMetrics]);

    const valueForMetric = (metricID: number): number => tmpLog.metrics.find((m) => m.body_metric_id === metricID)?.value ?? 0;

    const setValueForMetric = (metricID: number, value: number) => {
        const existing = tmpLog.metrics.find((m) => m.body_metric_id === metricID);
        if (existing) {
            existing.value = value;
        } else {
            tmpLog.metrics.push({bodylog_id: tmpLog.bodylog.id, body_metric_id: metricID, value});
        }
        setErrorMsg(null);
        render();
    };

    const doSave = () => {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setSaving(true);

        const newLog: UserBodyLog = {
            bodylog: tmpLog.bodylog,
            metrics: tmpLog.metrics.filter((m) => m.value !== 0),
        };

        onCreate(newLog)
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                // "#/metrics" is about the values as a whole, not one field, so it goes in the alert.
                setErrorMsg(e.fieldErrors().get('#/metrics') ?? e);
            })
            .finally(() => setSaving(false));
    };

    return (
        <EditorDialog title={title} saveLabel={saveButtonTitle} saving={saving} onSave={doSave} onClose={onCancel}>
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

                <ErrorDiv errorMsg={errorMsg} />
            </div>
        </EditorDialog>
    );
}
