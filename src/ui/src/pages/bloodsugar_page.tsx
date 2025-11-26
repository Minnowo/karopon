import {BaseState} from '../state/basestate';
import {TblUserEventLog} from '../api/types';
import {useEffect, useState} from 'preact/hooks';
import {GetUserEventLog} from '../api/api';
import { NumberInput2 } from '../components/number_input2';

export function BloodSugarPage(state: BaseState) {

    const [numberToShow, setNumberToShow] = useState<number>(5);
    const [eventLogs, setEventLog] = useState<Array<TblUserEventLog> | null>(null);

    useEffect(() => {
        GetUserEventLog().then((r) => setEventLog(r));
    }, []);

    if (eventLogs === null) {
        return <div class="">loading...</div>;
    }

    return (
        <main>
            <div className="w-full flex justify-evenly p-4">
                <button className="w-40">New Event</button>


    <NumberInput2 label={"Show Last"}value={numberToShow} onValueChange={setNumberToShow} numberList={[1, 2, 5, 10, 20, 50]} />

                <button className="w-40">Export</button>
            </div>

            <hr />
            <div className="mt-5">
                <text className="text-2xl font-medium ml-10">Events</text>
                <div className="flex flex-col items-center">
                    {eventLogs.slice(0, numberToShow).map((eventLog: TblUserEventLog) => {
                        return (
                            <div key={eventLog.id} className="bg-c-d-black border mt-3 w-9/10 rounded-sm border-c-yellow flex justify-between">
                                <div className="text-lg font-medium h-10 w-15 m-5 flex items-center justify-center border-b">
                                    {eventLog.event}
                                </div>
                                <div className="flex items-center">
                                    <div class="bg-gray-400 w-px h-10 mr-5" />
                                    <text className="text-lg font-[700] pr-3">Blood Sugar:</text>
                                    <text>{eventLog.blood_glucose}</text>
                                </div>
                                <div className="flex items-center">
                                    <div class="bg-gray-400 w-px h-10 mr-5" />
                                    <div className="flex items-center">{new Date(eventLog.user_time).toLocaleString()}</div>
                                </div>
                                <button className="flex items-center">Edit</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
