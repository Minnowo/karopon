import {useState, useMemo} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {TblUserBodyLog} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {CmToFeetInches, FeetInchesToCm, KgToLbs, LbsToKg} from '../../utils/units';
import {JSX} from 'preact';

type AddBodyPanelProps = {
    bodylog: TblUserBodyLog;
    onCreate: (bodylog: TblUserBodyLog) => void;
    onCancel: () => void;
    title: string;
    saveButtonTitle: string;
    preserveTime?: boolean;
    actionButtons?: JSX.Element[];
    className?: string;
};

export function AddBodyPanel({
    bodylog,
    onCreate,
    onCancel,
    title,
    saveButtonTitle,
    preserveTime = false,
    className = '',
}: AddBodyPanelProps) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const render = DoRender();

    const tmpLog = useMemo<TblUserBodyLog>(
        () => ({
            ...bodylog,
            created: Date.now(),
            user_time: preserveTime ? bodylog.user_time : Date.now(),
        }),
        [bodylog, preserveTime]
    );

    const doSave = () => {
        setErrorMsg(null);

        const newLog: TblUserBodyLog = {
            ...tmpLog,
            bmi: tmpLog.height_cm > 0 ? +(tmpLog.weight_kg / Math.pow(tmpLog.height_cm / 100, 2)).toFixed(2) : 0,
        };

        onCreate(newLog);
    };

    return (
        <>
            <div className={`container-theme ${className}`}>
                <div className="flex">
                    <span className="text-lg font-bold">{title}</span>
                </div>

                <ErrorDiv errorMsg={errorMsg} />

                <div className="flex flex-col gap-2 justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                            <span className="font-semibold">Weight</span>
                            <div className="flex gap-2">
                                <NumberInput
                                    className="flex-1"
                                    innerClassName="w-full"
                                    label="kg"
                                    step={1}
                                    min={0}
                                    precision={3}
                                    labelOnLeftSide={false}
                                    value={tmpLog.weight_kg}
                                    onValueChange={(v) => {
                                        tmpLog.weight_kg = v;
                                        render();
                                    }}
                                />
                                <NumberInput
                                    className="flex-1"
                                    innerClassName="w-full"
                                    label="lbs"
                                    step={1}
                                    min={0}
                                    precision={3}
                                    labelOnLeftSide={false}
                                    value={KgToLbs(tmpLog.weight_kg)}
                                    onValueChange={(v) => {
                                        tmpLog.weight_kg = LbsToKg(v);
                                        render();
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="font-semibold">Height</span>
                            <div className="flex flex-row gap-2">
                                <NumberInput
                                    className="flex-1"
                                    innerClassName="w-full"
                                    label="cm"
                                    value={tmpLog.height_cm}
                                    min={0}
                                    step={1}
                                    precision={2}
                                    labelOnLeftSide={false}
                                    onValueChange={(v) => {
                                        tmpLog.height_cm = v;
                                        render();
                                    }}
                                />

                                <NumberInput
                                    className="flex-1"
                                    innerClassName="w-full"
                                    label="ft"
                                    value={CmToFeetInches(tmpLog.height_cm).feet}
                                    min={0}
                                    step={1}
                                    precision={0}
                                    labelOnLeftSide={false}
                                    onValueChange={(v) => {
                                        const inches = CmToFeetInches(tmpLog.height_cm).inches;
                                        tmpLog.height_cm = FeetInchesToCm(v, inches);
                                        render();
                                    }}
                                />

                                <NumberInput
                                    className="flex-1"
                                    innerClassName="w-full"
                                    label="in"
                                    value={CmToFeetInches(tmpLog.height_cm).inches}
                                    min={0}
                                    max={11}
                                    step={1}
                                    labelOnLeftSide={false}
                                    onValueChange={(v) => {
                                        const feet = CmToFeetInches(tmpLog.height_cm).feet;
                                        tmpLog.height_cm = FeetInchesToCm(feet, v);
                                        render();
                                    }}
                                />
                            </div>
                        </div>

                        <NumberInput
                            className="flex-1"
                            innerClassName="flex-1 min-w-0"
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
                            className="flex-1"
                            innerClassName="flex-1 min-w-0"
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
                            className="flex-1"
                            innerClassName="flex-1 min-w-0"
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
                            className="flex-1"
                            innerClassName="flex-1 min-w-0"
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
                            className="flex-1"
                            innerClassName="flex-1 min-w-0"
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

                    <div className="flex justify-end gap-2">
                        <button className="cancel-btn" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="save-btn" onClick={doSave}>
                            {saveButtonTitle}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
