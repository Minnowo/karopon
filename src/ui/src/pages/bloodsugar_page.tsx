import {BaseState} from '../state/basestate';
import {CreateUserEventLog, TblUserEventLog} from '../api/types';
import {Dispatch, StateUpdater, useEffect, useState} from 'preact/hooks';
import {GetUserEventLog, LogEvent, UpdateUserEventLog} from '../api/api';
import {NumberInput2} from '../components/number_input2';
import {ChangeEvent, Fragment} from 'preact/compat';
import {DownloadData} from '../utils/download';
import {DropdownButton} from '../components/drop_down_button';
import {encodeCSVField} from '../utils/csv';
import {formatSmartTimestamp} from '../utils/date_utils';

type EventLogForm = {
    className?: string;
    eventLog: TblUserEventLog | null;
    onSave: (form: TblUserEventLog) => void;
};

function EditEventLogForm({className, eventLog, onSave}: EventLogForm) {
    const [form, setForm] = useState<TblUserEventLog>({
        id: 0,
        user_id: 0,
        event_id: 0,
        created: new Date().getTime(),
        user_time: new Date().getTime(),
        event: '',
        net_carbs: 0,
        blood_glucose: 0,
        blood_glucose_target: 0,
        insulin_sensitivity_factor: 0,
        insulin_to_carb_ratio: 0,
        recommended_insulin_amount: 0,
        actual_insulin_taken: 0,
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (eventLog !== null) {
            setForm({...eventLog});
        }
    }, [eventLog]);

    function update(field: string, val: number | string) {
        if (field == 'blood_glucose' && isNaN(+val)) {
            setForm((prev) => ({...prev, blood_glucose: -1}));
            return;
        }
        setForm((prev) => ({...prev, [field]: val}));
    }

    const handleSubmit = () => {
        setErrorMsg(null);

        if (form.event.trim() === '') {
            setErrorMsg('Event must have a name');
            return;
        }

        if (form.blood_glucose <= 0 || isNaN(form.blood_glucose)) {
            setErrorMsg('Blood glucose must be a positive number');
            return;
        }

        onSave(form);
    };

    return (
        <div className={`rounded-sm p-2 border container-theme bg-c-black ${className !== undefined ? className : ''}`}>
            <span className="text-lg font-bold">{eventLog === null ? 'Create New Event' : 'Update Event'}</span>

            <div className="flex flex-col font-semibold">
                {errorMsg !== null && <div className="text-c-l-red">{errorMsg}</div>}

                <input
                    className="mb-2 whitespace-nowrap flex-auto"
                    type="text"
                    value={form.event}
                    onInput={(e) => update('event', e.currentTarget.value.toString())}
                    placeholder="Event Name"
                />

                <div className="flex flex-col sm:flex-row flex-wrap justify-evenly">
                    <NumberInput2
                        className="my-1 sm:mr-1 sm:w-auto flex-1 flex-grow"
                        innerClassName="w-full min-w-12"
                        min={0}
                        max={1_000_000_000}
                        numberList={[1, 2, 5, 10, 50, 100, 200]}
                        label={'Blood Sugar'}
                        value={form.blood_glucose}
                        onValueChange={(portion: number) => update('blood_glucose', portion)}
                    />

                    <input
                        class="my-1 sm:mx-1 sm:w-auto"
                        type="datetime-local"
                        name="Event Date"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            update('created', new Date(e.currentTarget.value).getTime());
                        }}
                        value={new Date(form.created).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)}
                    />

                    <button className="ml-auto my-1 sm:ml-1 text-c-l-green min-w-32" onClick={handleSubmit}>
                        {eventLog === null ? 'Create Event' : 'Update Event'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function BloodSugarPage(state: BaseState) {
    const [numberToShow, setNumberToShow] = useState<number>(15);
    const [editingID, setEditing] = useState<number | null>(null);
    const [isAddingNewEvent, setAddingNewEvent] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    function updateEventLog(eventLog: TblUserEventLog) {
        UpdateUserEventLog(eventLog)
            .then(() => {
                const eventTempLogs = [...state.eventlog!];
                for (let i = 0; i < eventTempLogs.length; i++) {
                    if (eventTempLogs[i].id == eventLog.id) {
                        eventTempLogs[i] = eventLog;
                        break;
                    }
                }
                state.setEventlog(eventTempLogs);
                setErrorMsg(null);
                setEditing(null);
            })
            .catch((e: Error) => setErrorMsg(e.message));
    }

    function createEventLog(eventLog: TblUserEventLog) {
        const createEventLogData: CreateUserEventLog = {
            blood_glucose: Number(eventLog.blood_glucose),
            blood_glucose_target: 0,
            insulin_sensitivity_factor: 0,
            insulin_to_carb_ratio: 0,
            recommended_insulin_amount: 0,
            actual_insulin_taken: 0,
            event: {
                id: 0,
                user_id: 0,
                name: eventLog.event,
            },
            foods: [],
        };
        LogEvent(createEventLogData)
            .then(() => {
                state.setEventlog([...state.eventlog!, eventLog]);
                setErrorMsg(null);
                setAddingNewEvent(false);
            })
            .catch((e: Error) => setErrorMsg(e.message));
    }

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button className={`w-32 ${isAddingNewEvent && 'bg-c-l-red'}`} onClick={() => setAddingNewEvent((x) => !x)}>
                    {!isAddingNewEvent ? 'Add New Event' : 'Cancel'}
                </button>

                <NumberInput2
                    label={'Show Last'}
                    min={1}
                    step={5}
                    value={numberToShow}
                    onValueChange={setNumberToShow}
                    numberList={[1, 2, 5, 10, 20, 50]}
                />

                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-32"
                    label="Export"
                    actions={[
                        {
                            label: 'As CSV',
                            onClick: () => {
                                const headers = Object.keys(state.eventlog[0]) as (keyof TblUserEventLog)[];
                                const csvRows: string[] = [];

                                csvRows.push(headers.join(','));

                                for (const item of state.eventlog) {
                                    csvRows.push(headers.map((key) => encodeCSVField(String(item[key]))).join(','));
                                }

                                const csvContent = csvRows.join('\n');
                                const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
                                DownloadData(blob, 'eventlog.csv');
                            },
                        },
                        {
                            label: 'As JSON',
                            onClick: () => {
                                const json = JSON.stringify(state.eventlog, null, 2);
                                const blob = new Blob([json], {type: 'application/json'});
                                DownloadData(blob, 'eventlog.json');
                            },
                        },
                    ]}
                />
            </div>

            {errorMsg !== null && <div className="text-c-l-red">{errorMsg}</div>}
            {isAddingNewEvent && <EditEventLogForm eventLog={null} onSave={(form) => createEventLog(form)} />}

            {state.eventlog.slice(0, numberToShow).map((eventLog: TblUserEventLog) => {
                if (eventLog.id === editingID) {
                    return (
                        <EditEventLogForm
                            className="mt-3"
                            key={eventLog.id}
                            eventLog={eventLog}
                            onSave={(form) => updateEventLog(form)}
                        />
                    );
                }

                return (
                    <div
                        key={eventLog.id}
                        className="flex flex-row container-theme mt-3 rounded-sm justify-between items-center p-4"
                    >
                        <div className="w-full flex flex-col sm:flex-row">
                            <span className="w-full sm:w-2/5  font-medium h-fit truncate" title={eventLog.event}>
                                {eventLog.event}
                            </span>

                            <div className="w-full sm:w-3/5 flex flex-row flex-wrap justify-evenly items-center">
                                <span className="h-fit">
                                    <strong>Blood Sugar:</strong> {eventLog.blood_glucose}
                                </span>

                                <span className="h-fit">{formatSmartTimestamp(eventLog.user_time)}</span>
                            </div>
                        </div>

                        <DropdownButton
                            className="w-8 h-8"
                            actions={[
                                {label: 'Edit', onClick: () => setEditing(eventLog.id)},
                                {label: 'Delete', onClick: () => {}},
                            ]}
                        />
                    </div>
                );
            })}
        </>
    );
}
