import {BaseState} from '../../state/basestate';
import {useState} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';
import {TblUserBodyLog} from '../../api/types';
import {AddBodyPanel} from './add_bodylog_panel';
import {ApiError, ApiNewUserBodyLog} from '../../api/api';
import {BodyLogPanel} from './bodylog_panel';

export function BodyPage(state: BaseState) {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            setErrorMsg(e.message);
            if (e.isUnauthorizedError()) {
                state.doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsg(e.message);
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

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-24 ${showNewEventPanel && 'bg-c-l-red font-bold'}`}
                    onClick={() => setShowNewEventPanel((x) => !x)}
                >
                    {!showNewEventPanel ? 'New Event' : 'Cancel'}
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewEventPanel && <AddBodyPanel bodylog={tmpLog} addBodyLog={addBodyLog} />}

            {state.bodylogs.length === 0 ? (
                <div className="text-center font-bold py-32">
                    No entries found!
                    <br />
                    Try adding a new event!
                </div>
            ) : (
                state.bodylogs.map((log: TblUserBodyLog) => <BodyLogPanel key={log.id} bodyLog={log} />)
            )}
        </>
    );
}
