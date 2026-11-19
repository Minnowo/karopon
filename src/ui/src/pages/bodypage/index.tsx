import {BaseState} from '../../state/basestate';
import {RefreshOnUnauthorized} from '../../utils/error';
import {useState} from 'preact/hooks';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {UserBodyLog} from '../../api/types';
import {AddBodyPanel} from './add_bodylog_panel';
import {ApiDeleteUserBodyLog, ApiError, ApiNewUserBodyLog, ApiUpdateUserBodyLog} from '../../api/api';
import {BodyLogPanel} from './bodylog_panel';
import {LoadMore, useListPaging} from '../../components/load_more';

const EMPTY_LOG: UserBodyLog = {
    bodylog: {
        id: 0,
        user_id: 0,
        created: 0,
        user_time: 0,
    },
    metrics: [],
};

export function BodyPage(state: BaseState) {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [editLog, setEditLog] = useState<UserBodyLog | null>(null);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const paging = useListPaging({total: state.bodylogs.length});

    const [tmpLog, setTmpLog] = useState<UserBodyLog>(EMPTY_LOG);

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

    // addBodyLog and updateBodyLog reject with the API error so the panel can show it.
    const addBodyLog = (bodylog: UserBodyLog): Promise<void> => {
        return ApiNewUserBodyLog(bodylog)
            .then((log: UserBodyLog) => {
                state.setBodyLogs((e) => [log, ...(e === null ? [] : e)]);

                setTmpLog(EMPTY_LOG);
                setShowNewEventPanel(false);
                setErrorMsg(null);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const updateBodyLog = (bodylog: UserBodyLog): Promise<void> => {
        return ApiUpdateUserBodyLog(bodylog)
            .then((updated: UserBodyLog) => {
                state.setBodyLogs((e) => e.map((x) => (x.bodylog.id === updated.bodylog.id ? updated : x)));
                setEditLog(null);
                setErrorMsg(null);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const copyBodyLog = (bodylog: UserBodyLog) => {
        setTmpLog(bodylog);
        setShowNewEventPanel(true);
    };

    const deleteBodyLog = (bodylog: UserBodyLog) => {
        if (confirm('Delete this body log?')) {
            ApiDeleteUserBodyLog(bodylog.bodylog)
                .then(() => {
                    state.setBodyLogs((e) => e.filter((x) => x.bodylog.id !== bodylog.bodylog.id));
                    setErrorMsg(null);
                })
                .catch(handleErr);
        }
    };

    return (
        <>
            <div className="w-full flex flex-wrap justify-evenly gap-2 my-4">
                <button disabled={showNewEventPanel} onClick={() => setShowNewEventPanel(true)}>
                    New Event
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewEventPanel && (
                <AddBodyPanel
                    className="mb-4"
                    title="New Bodylog"
                    saveButtonTitle="Create"
                    bodylog={tmpLog}
                    bodyMetrics={state.bodyMetrics}
                    onCreate={addBodyLog}
                    onCancel={() => setShowNewEventPanel(false)}
                />
            )}

            {state.bodylogs.length === 0 ? (
                <div className="text-center py-32">
                    <h3>No entries found!</h3>
                    <small>Try adding a new body log!</small>
                </div>
            ) : (
                <div ref={paging.listRef} className="flex flex-col gap-4">
                    {state.bodylogs
                        .slice(0, paging.shown)
                        .map((log: UserBodyLog) =>
                            editLog?.bodylog.id === log.bodylog.id ? (
                                <AddBodyPanel
                                    key={log.bodylog.id}
                                    title="Edit Body Log"
                                    saveButtonTitle={'Update'}
                                    preserveTime={true}
                                    bodylog={editLog}
                                    bodyMetrics={state.bodyMetrics}
                                    onCreate={updateBodyLog}
                                    onCancel={() => setEditLog(null)}
                                    className="mb-4"
                                />
                            ) : (
                                <BodyLogPanel
                                    key={log.bodylog.id}
                                    bodyLog={log}
                                    bodyMetrics={state.bodyMetrics}
                                    onCopy={copyBodyLog}
                                    onEdit={(l) => setEditLog(l)}
                                    onDelete={deleteBodyLog}
                                />
                            )
                        )}
                </div>
            )}

            <LoadMore paging={paging} itemsName="body logs" />
        </>
    );
}
