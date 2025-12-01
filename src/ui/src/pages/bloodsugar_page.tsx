import {BaseState} from '../state/basestate';
import {CreateUserEventLog, TblUserEventLog} from '../api/types';
import {useEffect, useState} from 'preact/hooks';
import {GetUserEventLog, LogEvent, UpdateUserEventLog} from '../api/api';
import {NumberInput2} from '../components/number_input2';
import {ChangeEvent} from 'preact/compat';
import {DownloadData} from '../utils/download';
import {DropdownButton} from '../components/drop_down_button';

type EventLogForm = {
    eventlog: TblUserEventLog | null;
    onCancel: () => void;
    onSave: (form: TblUserEventLog) => void;
};

function EditEventLogForm({eventlog, onSave, onCancel}: EventLogForm) {
    const [form, setForm] = useState<TblUserEventLog>({
        id: 0,
        user_id: 0,
        event_id: 0,
        created: new Date().getTime(),
        user_time: new Date().getTime(),
        event: '',
        net_carbs: 0,
        blood_glucose: -1,
        blood_glucose_target: 0,
        insulin_sensitivity_factor: 0,
        insulin_to_carb_ratio: 0,
        recommended_insulin_amount: 0,
        actual_insulin_taken: 0,
    });
    const [bloodGlucoseError, setBloodGlucoseError] = useState<string | null>(null);
    const [eventNameError, setEventNameError] = useState<string | null>(null);
    const [sugarTakenError, setSugarTakenError] = useState<string | null>(null);

    useEffect(() => {
        if (eventlog != null) {
            setForm({...eventlog});
        }
    }, [eventlog]);

    function update(field: string, val: number | string) {
        if (field == 'blood_glucose' && isNaN(+val)) {
            setForm((prev) => ({...prev, blood_glucose: -1}));
            return;
        }
        setForm((prev) => ({...prev, [field]: val}));
    }

    const handleSubmit = (e: Event) => {
        const newBloodError =
            form.blood_glucose < 0 || isNaN(+form.blood_glucose) ? 'Blood glucose must be a positive number' : null;
        const newEventNameError = form.event == '' ? 'Event must have a name' : null;

        setEventNameError(newEventNameError);
        setBloodGlucoseError(newBloodError);

        if (newBloodError != null || newEventNameError != null) {
            return;
        }
        e.preventDefault();
        onSave(form);
    };

    return (
        <div class="bg-c-d-black border mt-3 rounded-sm border-c-yellow flex justify-between py-3">
            <form class="w-9/10 m-3">
                <div class="flex justify-center justify-between ml-5 mb-4">
                    <div class="flex flex-col w-6/10">
                        <span className={eventNameError == null ? '' : 'text-red-500'}>
                            {eventNameError == null ? 'Event Name' : eventNameError}
                        </span>
                        <input
                            placeholder={form.event != '' ? form.event : 'Enter event name'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                update('event', e.currentTarget.value.toString());
                            }}
                        />
                    </div>
                </div>

                <div class="flex items-center justify-evenly">
                    <div class="flex flex-col">
                        <span className={bloodGlucoseError != null ? 'text-red-500' : ''}>
                            {bloodGlucoseError == null ? 'Blood Sugar' : bloodGlucoseError}
                        </span>
                        <input
                            placeholder={form.blood_glucose < 0 ? 'Enter a value' : form.blood_glucose.toString()}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                update('blood_glucose', e.currentTarget.value);
                            }}
                        />
                    </div>

                    <div class="flex flex-col w-3/10">
                        <text>Time</text>
                        <input
                            class="w-full my-1 sm:mx-1"
                            type="datetime-local"
                            name="Event Date"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                update('created', new Date(e.currentTarget.value).getTime());
                            }}
                            value={new Date(form.created).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)}
                        />
                    </div>

                    {/* <div class="flex flex-col">
                        <span>Sugar Taken</span>
                        <input placeholder={'Enter a value'} />
                    </div> */}
                </div>
            </form>

            <div className="-my-3">
                <button
                    className="flex justify-center w-15 h-1/2 items-center border-0 border-l-1 rounded-b-none border-b-1 hover:bg-gray-800"
                    onClick={onCancel}
                >
                    X
                </button>
                <button
                    className="flex justify-center w-15 h-1/2 items-center border-0 border-l-1 rounded-t-none border-t-1 hover:bg-gray-800"
                    onClick={handleSubmit}
                >
                    Save
                </button>
            </div>
        </div>
    );
}

export function BloodSugarPage(state: BaseState) {
    const [numberToShow, setNumberToShow] = useState<number>(5);
    const [editingID, setEditing] = useState<number | null>(null);
    const [isAddingNewEvent, setAddingNewEvent] = useState<boolean>(false);

    // setEventLog(test_eventLog);

    function updateEventLog(eventLog: TblUserEventLog) {
        UpdateUserEventLog(eventLog).then(() => {
            const eventTempLogs = [...state.eventlog!];
            for (let i = 0; i < eventTempLogs.length; i++) {
                if (eventTempLogs[i].id == eventLog.id) {
                    eventTempLogs[i] = eventLog;
                    break;
                }
            }
            state.setEventlog(eventTempLogs);
        });
        setEditing(null);
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
        LogEvent(createEventLogData).then(() => {
            state.setEventlog([...state.eventlog!, eventLog]);
        });
        setAddingNewEvent(false);
    }

    function onExport() {
        const json = JSON.stringify(state.eventlog, ['event', 'blood_glucose', 'created'], 2);
        const blob = new Blob([json], {type: 'application/json'});
        DownloadData(blob, 'food-log.json');
    }

    return (
        <main class="text-base sm:text-xs md:text-sm lg:text-base">
            <div className="w-full flex justify-evenly p-4">
                <button
                    className="w-40 hover:bg-gray-800"
                    onClick={() => {
                        setAddingNewEvent(true);
                    }}
                >
                    New Event
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
                    buttonClassName="w-40 h-full hover:bg-gray-800"
                    label="Export"
                    actions={[
                        {
                            label: 'As JSON',
                            onClick: onExport,
                        },
                    ]}
                />
            </div>

            <hr />
            <div className="mt-5">
                <text className="text-2xl font-medium ml-10">Events</text>
                <div className="flex flex-col items-center">
                    {isAddingNewEvent && (
                        <div className={'w-9/10 mt-5'}>
                            <span>Creating event:</span>
                            <EditEventLogForm
                                eventlog={null}
                                onSave={(form) => createEventLog(form)}
                                onCancel={() => setAddingNewEvent(false)}
                            />
                            <hr className="mt-3"></hr>
                        </div>
                    )}
                    {state.eventlog.slice(0, numberToShow).map((eventLog: TblUserEventLog) => {
                        return eventLog.id == editingID ? (
                            <div className="w-9/10">
                                <EditEventLogForm
                                    key={eventLog.id}
                                    eventlog={eventLog}
                                    onSave={(form) => updateEventLog(form)}
                                    onCancel={() => setEditing(null)}
                                />
                            </div>
                        ) : (
                            <div
                                key={eventLog.id}
                                className="bg-c-d-black border border-c-yellow mt-3 w-9/10 rounded-sm flex justify-between"
                            >
                                <div className="font-medium h-10 max-w-md m-5 flex items-center justify-center border-b truncate ">
                                    {eventLog.event}
                                </div>

                                <div class="flex justify-between w-150">
                                    <div className="flex items-center">
                                        <div class="bg-gray-400 w-px h-10 mr-5" />
                                        <text className="font-[700] pr-3">Blood Sugar:</text>
                                        <text>{eventLog.blood_glucose}</text>
                                    </div>

                                    <div className="flex items-center">
                                        <div class="bg-gray-400 w-px h-10 mr-5" />
                                        <div className="flex items-center">{new Date(eventLog.created).toLocaleString()}</div>
                                    </div>

                                    <button
                                        className="flex justify-center w-15 items-center border-0 border-l-1 hover:bg-gray-800"
                                        onClick={() => {
                                            setEditing(eventLog.id);
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
