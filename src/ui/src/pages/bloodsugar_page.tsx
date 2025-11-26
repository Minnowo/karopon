import {BaseState} from '../state/basestate';
import {TblUserEventLog} from '../api/types';
import {useEffect, useState} from 'preact/hooks';
import {GetUserEventLog, UpdateUserEventLog} from '../api/api';
import {NumberInput2} from '../components/number_input2';

// import { test_eventLog } from '../testdata';

type EventLogForm = {
    eventlog: TblUserEventLog,
    onCancel: () => void,
    onSave: (form: TblUserEventLog) => void,
} 

function EditEventLogForm({eventlog , onSave, onCancel} : EventLogForm){
    const [form, setForm] = useState<TblUserEventLog>({
        ...eventlog
    });

    function update(field: string, val: number | string) {
        setForm(prev => ({...prev, [field]: val}))
    }

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        onSave(form);
    }

    return (
        <div class="bg-c-d-black border mt-3 w-9/10 rounded-sm border-c-yellow flex justify-between">
            <form class="w-9/10 m-3">
                <div class="flex items-center justify-between ml-5">

                    <div class="flex flex-col w-6/10">
                        <text>Event Name</text>
                        <input value={form.event}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {update("event", e.currentTarget.value.toString())}}
                        ></input>
                    </div>

                    <div class="flex flex-col w-3/10">
                        <text>Time</text>
                        <input 
                            class="w-full my-1 sm:mx-1"
                            type="datetime-local"
                            name="Event Date"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {update("created", new Date(e.currentTarget.value).getTime())}}
                            value={new Date(form.created).toLocaleString("sv-SE").replace(" ", "T").slice(0, 16)}                                                />
                    </div>
                </div>

                <div class="flex items-center justify-evenly">

                    <div class="flex flex-col">
                        <text>Blood Sugar</text>
                        <input value={form.blood_glucose.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {update("blood_glucose", Number(e.currentTarget.value))}}
                        ></input>
                    </div>

                    <div class="flex flex-col">
                        <text>Sugar Taken</text>
                        <input placeholder={"0"}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {}}
                        ></input>
                    </div>
                </div>

            </form>

            <div>
                <button class="flex justify-center w-15 h-1/2 items-center border-0 border-l-1 rounded-b-none border-b-1 hover:bg-gray-800" 
                onClick={onCancel}>X</button>
                <button class="flex justify-center w-15 h-1/2 items-center border-0 border-l-1 rounded-t-none border-t-1 hover:bg-gray-800" 
                onClick={handleSubmit}>Save</button>
            </div>
        </div>
    )
}

export function BloodSugarPage(state: BaseState) {
    const [numberToShow, setNumberToShow] = useState<number>(5);
    const [eventLogs, setEventLog] = useState<Array<TblUserEventLog> | null>(null);
    const [editingID, setEditing] = useState<number | null>(null);



    useEffect(() => {
        GetUserEventLog().then((r) => setEventLog(r));
    }, []);

    
    // setEventLog(test_eventLog);

    function updateEventLog(eventLog: TblUserEventLog){
        console.log(eventLog)
        UpdateUserEventLog(eventLog).then(() => {
            
            const eventTempLogs = [...eventLogs!];
            for (let i = 0; i < eventTempLogs.length; i++){
                if (eventTempLogs[i].id == eventLog.id) {
                    eventTempLogs[i] = eventLog;
                    break;
                }
            };
            setEventLog(eventTempLogs);
        });
        setEditing(null);
    }

    return (
        <main class="text-base sm:text-xs md:text-sm lg:text-base">
            <div className="w-full flex justify-evenly p-4">
                <button className="w-40 hover:bg-gray-800">New Event</button>

                <NumberInput2
                    label={'Show Last'}
                    min={1}
                    step={5}
                    value={numberToShow}
                    onValueChange={setNumberToShow}
                    numberList={[1, 2, 5, 10, 20, 50]}
                />

                <button className="w-40 hover:bg-gray-800">Export</button>
            </div>

            <hr />
            <div className="mt-5">
                <text className="text-2xl font-medium ml-10">Events</text>
                <div className="flex flex-col items-center">
                    {(eventLogs == null) ?
                        (<div class="">loading...</div>)
                    : (
                        (eventLogs).slice(0, numberToShow).map((eventLog: TblUserEventLog) => {
                            
                            return (
                                (eventLog.id == editingID) ? (
                                    <EditEventLogForm 
                                    key={eventLog.id}
                                    eventlog={eventLog}
                                    onSave={(form) => (updateEventLog(form))}
                                    onCancel={()=>(setEditing(null))}
                                    />
                                ) : (
                                <div key={eventLog.id}
                                className="bg-c-d-black border mt-3 w-9/10 rounded-sm border-c-yellow flex justify-between">
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
                                        onClick={() => {setEditing(eventLog.id)}}
                                        >Edit</button>

                                    </div>

                                </div> 
                                )
                            )})
                        )
                    }
                </div>
            </div>
        </main>
    );
}
