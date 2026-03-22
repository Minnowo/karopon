import {BaseState} from '../../state/basestate';
import {useState} from 'preact/hooks';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {TblUserBodyLog} from '../../api/types';
import {AddBodyPanel} from './add_bodylog_panel';
import {ApiDeleteUserBodyLog, ApiError, ApiNewUserBodyLog, ApiUpdateUserBodyLog} from '../../api/api';
import {BodyLogPanel} from './bodylog_panel';

export function BodyPage(state: BaseState) {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [editLog, setEditLog] = useState<TblUserBodyLog | null>(null);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);

    const [tmpLog, setTmpLog] = useState<TblUserBodyLog>({
        id: 0,
        user_id: 0,
        created: 0,
        user_time: 0,
        weight_kg: 0,
        height_cm: 0,
        body_fat_percent: 0,
        bmi: 0,
        bp_systolic: 0,
        bp_diastolic: 0,
        heart_rate_bpm: 0,
        steps_count: 0,
    });

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

    const addBodyLog = (bodylog: TblUserBodyLog) => {
        ApiNewUserBodyLog(bodylog)
            .then((log: TblUserBodyLog) => {
                state.setBodyLogs((e) => [log, ...(e === null ? [] : e)]);

                setTmpLog({
                    id: 0,
                    user_id: 0,
                    created: 0,
                    user_time: 0,
                    weight_kg: 0,
                    height_cm: 0,
                    body_fat_percent: 0,
                    bmi: 0,
                    bp_systolic: 0,
                    bp_diastolic: 0,
                    heart_rate_bpm: 0,
                    steps_count: 0,
                });
                setShowNewEventPanel(false);
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const updateBodyLog = (bodylog: TblUserBodyLog) => {
        ApiUpdateUserBodyLog(bodylog)
            .then((updated: TblUserBodyLog) => {
                state.setBodyLogs((e) => e.map((x) => (x.id === updated.id ? updated : x)));
                setEditLog(null);
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const copyBodyLog = (bodylog: TblUserBodyLog) => {
        setTmpLog(bodylog);
        setShowNewEventPanel(true);
    };

    const deleteBodyLog = (bodylog: TblUserBodyLog) => {
        ApiDeleteUserBodyLog(bodylog)
            .then(() => {
                state.setBodyLogs((e) => e.filter((x) => x.id !== bodylog.id));
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button disabled={showNewEventPanel} className={`w-24`} onClick={() => setShowNewEventPanel(true)}>
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
                    onCreate={addBodyLog}
                    onCancel={() => setShowNewEventPanel(false)}
                />
            )}

            {state.bodylogs.length === 0 ? (
                <div className="text-center font-bold py-32">
                    No entries found!
                    <br />
                    Try adding a new event!
                </div>
            ) : (
                <div className="space-y-4">
                    {state.bodylogs.map((log: TblUserBodyLog) =>
                        editLog?.id === log.id ? (
                            <AddBodyPanel
                                key={log.id}
                                title="Edit Body Log"
                                saveButtonTitle={'Update'}
                                preserveTime={true}
                                bodylog={editLog}
                                onCreate={updateBodyLog}
                                onCancel={() => setEditLog(null)}
                                className="mb-4"
                            />
                        ) : (
                            <BodyLogPanel
                                key={log.id}
                                bodyLog={log}
                                onCopy={copyBodyLog}
                                onEdit={(l) => setEditLog(l)}
                                onDelete={deleteBodyLog}
                            />
                        )
                    )}
                </div>
            )}
        </>
    );
}
