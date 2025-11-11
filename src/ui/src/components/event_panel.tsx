import { TblUserEvent, TblUserFoodLog } from "../api/types";
import { NumberInput } from './number_input';
import { DropdownButton } from './drop_down_button';
import { useState, useRef } from 'preact/hooks';
import { formatSmartTimestamp } from '../../utils/date_utils';
import { GetUserFoodLog } from "../api/api";
import "./event_panel.css";

type EventPanelProps = {
    event: TblUserEvent;
    // foodLog: TblUserFoodLog[];
}

async function getEventFoodLog(event_id : number): Promise<TblUserFoodLog []> {
    let foodLogs: TblUserFoodLog[] = await GetUserFoodLog(); 
    //dev
    // let foodLogs = foodLogsTest;
    return foodLogs.filter(
        (foodLog) => foodLog.event_id == event_id
    );

}


export function EventPanel({event} : EventPanelProps){
    const [foodlog, setFoodlog] = useState<Array<TblUserFoodLog> | null>(null);
    const [showFoodLogs, setShowFoodLogs] = useState(false);

    const onExpandEventFoodLog = () => {
        // document
        if (foodlog === null) {
            getEventFoodLog(event.id).then(
                (response) => setFoodlog(response)
            );
        }
        if (showFoodLogs === false) {
            setShowFoodLogs(true);
        }
        else {
            setShowFoodLogs(false);
        }
    }

    let content = [<div class="">loading...</div>];

    if (foodlog !== null) {
        content = foodlog.map(
            (food) => {
                return <div className="food-item-list">
                        <text>{food.name}</text>
                    </div>
            }
        );
    }


    return (
        <div key={event.id} className="rounded - sm p-2 border container-theme">
            <div className="event-header">
                <text className="font-semibold">{event.name}</text>
                <div>
                    <button>Rename</button>
                    <button>Delete</button>
                </div>
            </div>
            <div className="flex items-center justify-center flex-col">
                {showFoodLogs && (
                    <div className="food-item">
                        <div className="food-item-list-header">
                            <text>Food list:</text>
                        </div>
                        {content}
                    </div>
                )}

                <button id="expand-button" className={showFoodLogs ? "event-expand-button reverse" : "event-expand-button"} onClick={onExpandEventFoodLog}>
                    <svg className={showFoodLogs ? "arrow-icon reverse" : "arrow-icon"} viewBox="0 0 384 512">
                        <path
                            d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"
                        ></path>
                    </svg>
                </button>
            </div>

        </div>
    );
}

