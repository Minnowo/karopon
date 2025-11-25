import { useState } from 'preact/hooks';
import {BaseState} from '../state/basestate';
import { TblUserEventLog } from '../api/types';

const test_eventLog : TblUserEventLog[]= [{
    id: 1,
    user_id: 1,
    event_id: 1,
    created: 1,
    user_time: new Date().getTime(),
    event: "event1",
    net_carbs: 1,
    blood_glucose: 1,
    blood_glucose_target: 1,
    insulin_sensitivity_factor: 1,
    insulin_to_carb_ratio: 1,
    recommended_insulin_amount: 1,
    actual_insulin_taken: 1,
    },
    {
    id: 1,
    user_id: 1,
    event_id: 1,
    created: 1,
    user_time: 1,
    event: "event2",
    net_carbs: 1,
    blood_glucose: 1,
    blood_glucose_target: 1,
    insulin_sensitivity_factor: 1,
    insulin_to_carb_ratio: 1,
    recommended_insulin_amount: 1,
    actual_insulin_taken: 1,
    },
    {
    id: 1,
    user_id: 1,
    event_id: 1,
    created: 1,
    user_time: 1,
    event: "event3",
    net_carbs: 1,
    blood_glucose: 1,
    blood_glucose_target: 1,
    insulin_sensitivity_factor: 1,
    insulin_to_carb_ratio: 1,
    recommended_insulin_amount: 1,
    actual_insulin_taken: 1,
    },
    {
    id: 1,
    user_id: 1,
    event_id: 1,
    created: 1,
    user_time: 1,
    event: "string",
    net_carbs: 1,
    blood_glucose: 1,
    blood_glucose_target: 1,
    insulin_sensitivity_factor: 1,
    insulin_to_carb_ratio: 1,
    recommended_insulin_amount: 1,
    actual_insulin_taken: 1,
    },
    {
    id: 1,
    user_id: 1,
    event_id: 1,
    created: 1,
    user_time: 1,
    event: "event4",
    net_carbs: 1,
    blood_glucose: 1,
    blood_glucose_target: 1,
    insulin_sensitivity_factor: 1,
    insulin_to_carb_ratio: 1,
    recommended_insulin_amount: 1,
    actual_insulin_taken: 1,
    },
    {
    id: 1,
    user_id: 1,
    event_id: 1,
    created: 1,
    user_time: 1,
    event: "event5",
    net_carbs: 1,
    blood_glucose: 1,
    blood_glucose_target: 1,
    insulin_sensitivity_factor: 1,
    insulin_to_carb_ratio: 1,
    recommended_insulin_amount: 1,
    actual_insulin_taken: 1,
    },
];

export function BloodSugarPage(state: BaseState) {
    const [open, setOpen] = useState(false);
    const [numberToShow, setNumberToShow] = useState<number>(5);

    const recommendedLimit = [1,2,5,10,20,50]

    return (
        <main>
            <div className="w-full flex justify-evenly w-full p-4">
                <button className="w-40">New Event</button>

                <div className="w-40 flex relative">
                    <button className="w-24 border-r-0 rounded-l-md rounded-r-none"
                        onClick={() => setOpen(!open)}
                        onBlur={() => setOpen(false)}>
                        Show Last
                    </button>
                    <input className="pl-2 w-9 rounded-l-none rounded-r-none border-r-0 focus:outline-none" 
                        value={numberToShow} 
                        onFocus={() => setOpen(true)} 
                        onBlur={() => setOpen(false)}
                        onChange={(e) => {
                            if (e != null){
                                const number = Number(e.currentTarget.value); 
                                if (number != null){
                                    setNumberToShow(number);
                                }
                            }
                        }}
                        >
                    </input>
                    <div className="flex flex-col w-6">
                        <button 
                        className="rounded-l-none rounded-b-none px-1 leading-none border-l-0 border-b-0 hover:bg-gray-100"
                        onClick={() => setNumberToShow(numberToShow+1)}>
                            ▲
                        </button>
                        <button 
                        className="rounded-l-none rounded-t-none px-1 leading-none border-l-0 border-t-0 hover:bg-gray-100"
                        onClick={() => {
                            if (numberToShow > 0){
                                setNumberToShow(numberToShow-1)
                            }
                            }}>
                            ▼    
                        </button>
                    </div>
                    {open && (
                        <div className="absolute left-24 top-full">
                            {recommendedLimit.map((limit: number) => {
                                return (
                                    <div className="border px-0.5 w-15 bg-black hover:bg-gray-500"
                                    onMouseDown={() => setNumberToShow(limit)}>
                                        {limit}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                
                <button className="w-40">Export</button>
            </div>

            <hr></hr>
            <div className="mt-5">
                <text className="text-2xl font-medium ml-10">Events</text>
                <div className="flex flex-col items-center">
                    {
                        test_eventLog.slice(0,numberToShow).map((eventLog: TblUserEventLog) => {
                            return (
                                <div className="bg-c-d-black border mt-3 w-9/10 rounded-sm border-c-yellow flex justify-between">
                                    <div className="text-lg font-medium h-10 w-15 m-5 flex items-center justify-center border-b">{eventLog["event"]}</div>
                                    <div className="flex items-center">
                                        <div class="bg-gray-400 w-px h-10 mr-5"/>
                                        <text className="text-lg font-[700] pr-3">
                                            Blood Sugar:
                                        </text>
                                        <text>
                                            {eventLog["blood_glucose"]}
                                        </text>
                                    </div>
                                    <div className="flex items-center">
                                        <div class="bg-gray-400 w-px h-10 mr-5"/>
                                        <div className="flex items-center">{new Date(eventLog["user_time"]).toLocaleString()}</div>                                    
                                    </div>
                                    <button className="flex items-center">Edit</button>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </main>
    )
}