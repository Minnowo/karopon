import {BaseState} from '../../state/basestate';
import {DownloadData, GenerateEventTableText} from '../../utils/download';
import {encodeCSVField} from '../../utils/csv';
import {TblUserFood} from '../../api/types';
import {ApiGetUserExercises, ApiGetUserWorkouts} from '../../api/api';
import {ExerciseText, WorkoutText} from '../workoutpage/structure';
import {useState} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';
import {GetErrorHandler} from '../../utils/error';

const downloadText = (text: string, filename: string) =>
    DownloadData(new Blob([text], {type: 'text/plain; charset=utf-8'}), filename);

export function DataExportPage(state: BaseState) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const handleErr = GetErrorHandler(setErrorMsg, state.doRefresh);

    return (
        <div className="flex flex-col gap-4">
            <ErrorDiv errorMsg={errorMsg} />

            <section className="flex flex-col gap-2">
                <h2>Event Export</h2>
                <div className="flex flex-wrap gap-2">
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

            <section className="flex flex-col gap-2">
                <h2>Food Export</h2>
                <div className="flex flex-wrap gap-2">
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

            <section className="flex flex-col gap-2">
                <h2>Workout Export</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            Promise.all([ApiGetUserWorkouts(), ApiGetUserExercises()])
                                .then(([workouts, exercises]) =>
                                    downloadText(workouts.map((w) => WorkoutText(w, exercises)).join('\n\n\n'), 'workouts.txt')
                                )
                                .catch(handleErr);
                        }}
                    >
                        Export Workouts as Text
                    </button>
                    <button
                        onClick={() => {
                            ApiGetUserExercises()
                                .then((exercises) =>
                                    downloadText(exercises.map((e) => ExerciseText(e)).join('\n\n'), 'exercises.txt')
                                )
                                .catch(handleErr);
                        }}
                    >
                        Export Exercises as Text
                    </button>
                </div>
            </section>
        </div>
    );
}
