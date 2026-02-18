import {useState, useMemo} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {TblUserBodyLog} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {CmToFeetInches, FeetInchesToCm, KgToLbs, LbsToKg} from '../../utils/units';

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
            ...state.bodylog,
            created: Date.now(),
            user_time: Date.now(),
        }),
        [state.bodylog]
    );

    const onSaveClick = () => {
        setErrorMsg(null);

        const newLog: TblUserBodyLog = {
            ...tmpLog,
            bmi: tmpLog.height_cm > 0 ? +(tmpLog.weight_kg / Math.pow(tmpLog.height_cm / 100, 2)).toFixed(2) : 0,
        };

        state.addBodyLog(newLog);
    };

    return (
        <>
            <div className={`rounded-sm p-2 border container-theme ${state.className}`}>
                <span className="text-lg font-bold">New Body Log</span>
                <ErrorDiv errorMsg={errorMsg} />
                <div className="flex flex-col justify-between">
                    <div className="w-full flex flex-wrap">
                        <div className="w-full flex flex-col">
                            <span className="font-semibold">Weight</span>
                            <div className="w-full flex flex-row gap-2">
                                <NumberInput
                                    className="w-full my-1"
                                    innerClassName="w-full"
                                    label="kg"
                                    step={1}
                                    min={0}
                                    precision={3}
                                    value={tmpLog.weight_kg}
                                    onValueChange={(v) => {
                                        tmpLog.weight_kg = v;
                                        render();
                                    }}
                                />
                                <NumberInput
                                    className="w-full my-1"
                                    innerClassName="w-full"
                                    label="lbs"
                                    step={1}
                                    min={0}
                                    precision={3}
                                    value={KgToLbs(tmpLog.weight_kg)}
                                    onValueChange={(v) => {
                                        tmpLog.weight_kg = LbsToKg(v);
                                        render();
                                    }}
                                />
                            </div>
                        </div>

                        <div className="w-full flex flex-col">
                            <span className="font-semibold">Height</span>
                            <div className="w-full flex flex-row gap-2">
                                <NumberInput
                                    className="w-full my-1"
                                    innerClassName="w-full"
                                    label="cm"
                                    value={tmpLog.height_cm}
                                    min={0}
                                    step={1}
                                    precision={2}
                                    onValueChange={(v) => {
                                        tmpLog.height_cm = v;
                                        render();
                                    }}
                                />

                                <NumberInput
                                    className="w-full my-1"
                                    innerClassName="w-full"
                                    label="ft"
                                    value={CmToFeetInches(tmpLog.height_cm).feet}
                                    min={0}
                                    step={1}
                                    precision={0}
                                    onValueChange={(v) => {
                                        const inches = CmToFeetInches(tmpLog.height_cm).inches;
                                        tmpLog.height_cm = FeetInchesToCm(v, inches);
                                        render();
                                    }}
                                />

                                <NumberInput
                                    className="w-full my-1"
                                    innerClassName="w-full"
                                    label="in"
                                    value={CmToFeetInches(tmpLog.height_cm).inches}
                                    min={0}
                                    max={11}
                                    step={1}
                                    onValueChange={(v) => {
                                        const feet = CmToFeetInches(tmpLog.height_cm).feet;
                                        tmpLog.height_cm = FeetInchesToCm(feet, v);
                                        render();
                                    }}
                                />
                            </div>
                        </div>

                        <NumberInput
                            className="w-full my-1"
                            innerClassName="w-full"
                            label="Body Fat %"
                            step={1}
                            min={0}
                            precision={3}
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
                            step={1}
                            min={0}
                            precision={3}
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
                            step={1}
                            min={0}
                            precision={3}
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
                            step={1}
                            min={0}
                            precision={3}
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
                            step={1}
                            min={0}
                            precision={3}
                            value={tmpLog.steps_count}
                            onValueChange={(v) => {
                                tmpLog.steps_count = v;
                                render();
                            }}
                        />
                    </div>

                    <div className="flex justify-end mt-2">
                        <button className="bg-c-green font-bold max-w-32 w-full" onClick={onSaveClick}>
                            Save Log
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
