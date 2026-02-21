import {BaseState} from '../../state/basestate';
import {DownloadData, GenerateEventTableText} from '../../utils/download';
import {encodeCSVField} from '../../utils/csv';
import {TblUserFood} from '../../api/types';

export function DataExportPage(state: BaseState) {
    return (
        <main className="flex flex-col space-y-4 sm:px-16 lg:px-32 py-4">
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-c-peach">Event Export</h2>
                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            const blob = new Blob([GenerateEventTableText(state.user, state.eventlogs)], {
                                type: 'text/plain; charset=utf-8',
                            });
                            DownloadData(blob, 'eventlogs.txt');
                        }}
                    >
                        Export as Text
                    </button>
                    <button
                        onClick={() => {
                            const jsonStr = JSON.stringify(state.eventlogs, null, 2);
                            const blob = new Blob([jsonStr], {type: 'application/json'});
                            DownloadData(blob, 'eventlogs.json');
                        }}
                    >
                        Export as JSON
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-c-peach">Food Export</h2>
                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            const headers = Object.keys(state.foods[0]) as Array<keyof TblUserFood>;
                            const csvRows: string[] = [];

                            csvRows.push(headers.join(','));

                            for (const item of state.foods) {
                                csvRows.push(headers.map((key) => encodeCSVField(String(item[key]))).join(','));
                            }

                            const csvContent = csvRows.join('\n');
                            const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
                            DownloadData(blob, 'foods.csv');
                        }}
                    >
                        Export as CSV
                    </button>
                    <button
                        onClick={() => {
                            const jsonStr = JSON.stringify(state.foods, null, 2);
                            const blob = new Blob([jsonStr], {type: 'application/json'});
                            DownloadData(blob, 'foods.json');
                        }}
                    >
                        Export as JSON
                    </button>
                </div>
            </section>
        </main>
    );
}
