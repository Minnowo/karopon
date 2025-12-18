import {BaseState} from '../state/basestate';
import {UserEventFoodLog} from '../api/types';
import {useState} from 'preact/hooks';
import {NumberInput} from '../components/number_input';
import {DownloadData} from '../utils/download';
import {DropdownButton} from '../components/drop_down_button';
import {encodeCSVField} from '../utils/csv';
import {formatSmartTimestamp} from '../utils/date_utils';

export function BloodSugarPage(state: BaseState) {
    const [numberToShow, setNumberToShow] = useState<number>(15);

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <NumberInput
                    label={'Show Last'}
                    min={1}
                    step={5}
                    value={numberToShow}
                    onValueChange={setNumberToShow}
                    numberList={[1, 2, 5, 10, 20, 50]}
                />
            </div>

            {state.eventlogs.length === 0 && (
                <div className="text-center font-bold p-32">
                    No entries found! Karopon did a tiny dance anyway.
                    <br />
                    Try adding a new event!
                </div>
            )}

            {state.eventlogs.slice(0, numberToShow).map((eventLog: UserEventFoodLog) => {
                return (
                    <div
                        key={eventLog.eventlog.id}
                        className="flex flex-row container-theme mt-3 rounded-sm justify-between items-center p-4"
                    >
                        <span className="w-full sm:w-2/5 font-medium h-fit" title={eventLog.eventlog.event}>
                            {eventLog.eventlog.event}
                        </span>

                        <div className="w-full sm:w-3/5 flex flex-row flex-wrap justify-evenly items-center">
                            <span className="h-fit">
                                <strong>Blood Sugar:</strong> {eventLog.eventlog.blood_glucose.toFixed(1)}
                            </span>

                            <span className="h-fit">{formatSmartTimestamp(eventLog.eventlog.user_time)}</span>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
