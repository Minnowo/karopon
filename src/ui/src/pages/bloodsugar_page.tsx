import {BaseState} from '../state/basestate';
import {TblUserEventLog} from '../api/types';
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

                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-24"
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

            {state.eventlog.length === 0 && (
                <div className="text-center font-bold p-32">
                    No entries found! Karopon did a tiny dance anyway.
                    <br />
                    Try adding a new event!
                </div>
            )}

            {state.eventlog.slice(0, numberToShow).map((eventLog: TblUserEventLog) => {
                return (
                    <div
                        key={eventLog.id}
                        className="flex flex-row container-theme mt-3 rounded-sm justify-between items-center p-4"
                    >
                        <span className="w-full sm:w-2/5 font-medium h-fit" title={eventLog.event}>
                            {eventLog.event}
                        </span>

                        <div className="w-full sm:w-3/5 flex flex-row flex-wrap justify-evenly items-center">
                            <span className="h-fit">
                                <strong>Blood Sugar:</strong> {eventLog.blood_glucose}
                            </span>

                            <span className="h-fit">{formatSmartTimestamp(eventLog.user_time)}</span>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
