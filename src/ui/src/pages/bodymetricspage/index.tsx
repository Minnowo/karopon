import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {ApiDeleteUserBodyMetric, ApiError, ApiNewUserBodyMetric} from '../../api/api';
import {TblUserBodyMetric} from '../../api/types';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {DropdownButton} from '../../components/drop_down_button';
import {AddBodyMetricPanel} from './add_body_metric_panel';

export const BodyMetricsPage = (state: BaseState) => {
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [showNewMetric, setShowNewMetric] = useState(false);

    const handleErr = (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsg(e);
            if (e.isUnauthorizedError()) {
                state.doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsg(e);
        } else {
            setErrorMsg(`An unknown error occurred: ${e}`);
        }
    };

    const createMetric = (name: string, unit: string) => {
        ApiNewUserBodyMetric({id: 0, user_id: state.user.id, name, unit})
            .then((metric) => {
                state.setBodyMetrics((old) => [...old, metric].sort((a, b) => a.name.localeCompare(b.name)));
                setShowNewMetric(false);
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const deleteMetric = (metric: TblUserBodyMetric) => {
        if (!confirm(`Delete body metric "${metric.name}"? Any recorded values for it will also be removed.`)) {
            return;
        }
        ApiDeleteUserBodyMetric(metric)
            .then(() => {
                state.setBodyMetrics((old) => old.filter((m) => m.id !== metric.id));
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const sortedMetrics = [...state.bodyMetrics].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    disabled={showNewMetric}
                    className="px-3 py-1"
                    onClick={() => {
                        setShowNewMetric(true);
                        setErrorMsg(null);
                    }}
                >
                    New Body Metric
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewMetric && <AddBodyMetricPanel onCreate={createMetric} onCancel={() => setShowNewMetric(false)} />}

            <div className="flex flex-col gap-2">
                {sortedMetrics.length === 0 ? (
                    <p>No body metrics defined yet.</p>
                ) : (
                    sortedMetrics.map((m) => (
                        <div key={m.id} className="surface-1 flex items-center gap-2">
                            <span className="flex-1 text-sm">
                                {m.name}
                                {m.unit && <span className="text-c-on-surface-variant"> ({m.unit})</span>}
                            </span>
                            <DropdownButton actions={[{label: 'Delete', dangerous: true, onClick: () => deleteMetric(m)}]} />
                        </div>
                    ))
                )}
            </div>
        </>
    );
};
