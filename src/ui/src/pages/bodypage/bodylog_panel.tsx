import {useState} from 'preact/hooks';
import {TblUserBodyLog} from '../../api/types';
import {formatSmartTimestamp} from '../../utils/date_utils';

type BodyLogPanelProps = {
    bodyLog: TblUserBodyLog;
};

function Row({label, value}: {label: string; value: string}) {
    return (
        <tr>
            <td className="whitespace-nowrap">{label}</td>
            <td className="text-right pr-2">{value}</td>
        </tr>
    );
}

export function BodyLogPanel({bodyLog}: BodyLogPanelProps) {
    const [expanded, setExpanded] = useState<boolean>(false);

    const toggle = () => setExpanded((x) => !x);

    return (
        <div className="w-full p-2 border container-theme">
            <div className="flex flex-row flex-wrap w-full justify-between align-middle">
                <span className="text-s font-semibold">Body Log</span>
                <span className="text-s font-semibold">{formatSmartTimestamp(bodyLog.user_time)}</span>
            </div>

            <div className="flex flex-row flex-wrap w-full justify-evenly cursor-pointer" onClick={toggle}>
                <span>{`Weight ${bodyLog.weight_kg.toFixed(1)} kg`}</span>
                <span>{`BMI ${bodyLog.bmi.toFixed(1)}`}</span>
                <span>{`BF ${bodyLog.body_fat_percent.toFixed(1)} %`}</span>
            </div>

            {expanded && (
                <div className="w-full mt-2 overflow-x-scroll">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-xs border-b">
                                <th className="font-normal text-left py-1">Metric</th>
                                <th className="font-normal text-right py-1 pr-2">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Row label="Height" value={`${bodyLog.height_cm.toFixed(1)} cm`} />
                            <Row label="Blood Pressure" value={`${bodyLog.bp_systolic}/${bodyLog.bp_diastolic}`} />
                            <Row label="Heart Rate" value={`${bodyLog.heart_rate_bpm} bpm`} />
                            <Row label="Steps" value={bodyLog.steps_count.toLocaleString()} />
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
