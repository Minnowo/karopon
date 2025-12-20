import {BaseState} from '../../state/basestate';
import {useState, useMemo, Dispatch, StateUpdater} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';
import {NumberInput} from '../../components/number_input';
import {DoRender} from '../../hooks/doRender';
import {TblUserBodyLog} from '../../api/types';

type AddBodyPanelProps = {
    bodylog: TblUserBodyLog;
    addBodyLog: (bodylog: TblUserBodyLog) => void;
    className?: string;
};
export function AddBodyPanel(state: AddBodyPanelProps) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const render = DoRender();

    const tmpLog = useMemo<TblUserBodyLog>(
        () => ({
            id: 0,
            user_id: 0,
            created: Date.now(),
            user_time: Date.now(),
            weight_kg: 0,
            height_cm: 0,
            body_fat_percent: 0,
            bmi: 0,
            bp_systolic: 0,
            bp_diastolic: 0,
            heart_rate_bpm: 0,
            steps_count: 0,
        }),
        []
    );

    const onSaveClick = () => {
        setErrorMsg(null);

        if (tmpLog.weight_kg <= 0) {
            setErrorMsg('Weight must be greater than 0');
            return;
        }

        if (tmpLog.height_cm <= 0) {
            setErrorMsg('Height must be greater than 0');
            return;
        }

        const newLog: TblUserBodyLog = {
            ...tmpLog,
            bmi: tmpLog.height_cm > 0 ? +(tmpLog.weight_kg / Math.pow(tmpLog.height_cm / 100, 2)).toFixed(2) : 0,
        };

        state.addBodyLog(newLog);
    };

    return (
        <>
            <div className={`rounded-sm p-2 border container-theme bg-c-black ${state.className}`}>
                <span className="text-lg font-bold">New Body Log</span>
                <ErrorDiv errorMsg={errorMsg} />
                <div className="flex flex-col justify-between">
                    <div className="flex flex-wrap">
                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="Weight (kg)"
                            min={0}
                            value={tmpLog.weight_kg}
                            onValueChange={(v) => {
                                tmpLog.weight_kg = v;
                                render();
                            }}
                        />

                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="Height (cm)"
                            min={0}
                            value={tmpLog.height_cm}
                            onValueChange={(v) => {
                                tmpLog.height_cm = v;
                                render();
                            }}
                        />

                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="Body Fat %"
                            min={0}
                            value={tmpLog.body_fat_percent}
                            onValueChange={(v) => {
                                tmpLog.body_fat_percent = v;
                                render();
                            }}
                        />

                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="Heart Rate (bpm)"
                            min={0}
                            value={tmpLog.heart_rate_bpm}
                            onValueChange={(v) => {
                                tmpLog.heart_rate_bpm = v;
                                render();
                            }}
                        />

                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="BP Systolic"
                            min={0}
                            value={tmpLog.bp_systolic}
                            onValueChange={(v) => {
                                tmpLog.bp_systolic = v;
                                render();
                            }}
                        />

                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="BP Diastolic"
                            min={0}
                            value={tmpLog.bp_diastolic}
                            onValueChange={(v) => {
                                tmpLog.bp_diastolic = v;
                                render();
                            }}
                        />

                        <NumberInput
                            className="w-full mt-1"
                            innerClassName="w-full"
                            label="Steps"
                            min={0}
                            value={tmpLog.steps_count}
                            onValueChange={(v) => {
                                tmpLog.steps_count = v;
                                render();
                            }}
                        />
                    </div>

                    <div className="flex justify-end mt-2">
                        <button className="text-c-l-green max-w-32" onClick={onSaveClick}>
                            Save Log
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
