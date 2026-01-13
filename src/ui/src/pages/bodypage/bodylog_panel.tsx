import {TblUserBodyLog} from '../../api/types';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {CmToFeetInches, KgToLbs} from '../../utils/units';
import {ComponentChildren} from 'preact';
import {DropdownButton} from '../../components/drop_down_button';

type BodyLogPanelProps = {
    bodyLog: TblUserBodyLog;
    onCopy: (log: TblUserBodyLog) => void;
    onEdit: (log: TblUserBodyLog) => void;
    onDelete: (log: TblUserBodyLog) => void;
};

const Metric = ({label, value}: {label: string; value: ComponentChildren}) => (
    <div className="flex flex-wrap justify-between py-1 text-sm">
        <span className="">{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);

const Section = ({title, children}: {title: string; children: ComponentChildren}) => (
    <div className="mb-3">
        <div className="text-xs font-semibold uppercase mb-1">{title}</div>
        <div className="rounded border border-c-l-black p-2 divide-y divide-c-l-black">{children}</div>
    </div>
);

export function BodyLogPanel({bodyLog, onCopy, onEdit, onDelete}: BodyLogPanelProps) {
    const fi = bodyLog.height_cm > 0 ? CmToFeetInches(bodyLog.height_cm) : null;

    return (
        <div className="w-full p-3 border rounded container-theme">
            <div className="flex flex-row flex-wrap w-full justify-between align-middle">
                <span />
                <div className="text-center font-semibold">{formatSmartTimestamp(bodyLog.user_time)}</div>
                <DropdownButton
                    actions={[
                        {
                            label: 'Copy',
                            onClick: () => onCopy({...bodyLog}),
                        },
                        {label: 'Edit', onClick: () => onEdit({...bodyLog})},
                        {
                            label: 'Delete',
                            dangerous: true,
                            onClick: () => onDelete({...bodyLog}),
                        },
                    ]}
                />
            </div>

            {(bodyLog.weight_kg > 0 || bodyLog.height_cm > 0 || bodyLog.bmi > 0 || bodyLog.body_fat_percent > 0) && (
                <Section title="Body">
                    {bodyLog.weight_kg > 0 && (
                        <Metric
                            label="Weight"
                            value={
                                <>
                                    {bodyLog.weight_kg.toFixed(1)} kg
                                    <span className="mx-2 text-faded">/</span>
                                    {KgToLbs(bodyLog.weight_kg).toFixed(1)} lbs
                                </>
                            }
                        />
                    )}
                    {bodyLog.height_cm > 0 && (
                        <Metric
                            label="Height"
                            value={
                                <>
                                    {bodyLog.height_cm.toFixed(1)} cm
                                    <span className="mx-2 text-faded">/</span>
                                    {fi!.feet.toFixed(0)} ft {fi!.inches.toFixed(1)} in
                                </>
                            }
                        />
                    )}
                    {bodyLog.bmi > 0 && <Metric label="BMI" value={bodyLog.bmi.toFixed(1)} />}
                    {bodyLog.body_fat_percent > 0 && (
                        <Metric label="Body Fat" value={`${bodyLog.body_fat_percent.toFixed(1)}%`} />
                    )}
                </Section>
            )}

            {(bodyLog.bp_systolic > 0 || bodyLog.heart_rate_bpm > 0) && (
                <Section title="Vitals">
                    {bodyLog.bp_systolic > 0 && bodyLog.bp_diastolic > 0 && (
                        <Metric
                            label="Blood Pressure"
                            value={
                                <>
                                    {bodyLog.bp_systolic.toFixed(0)} sys
                                    <span className="mx-2 text-faded">/</span>
                                    {bodyLog.bp_diastolic.toFixed(0)} dia
                                </>
                            }
                        />
                    )}
                    {bodyLog.heart_rate_bpm > 0 && <Metric label="Heart Rate" value={`${bodyLog.heart_rate_bpm} bpm`} />}
                </Section>
            )}

            {bodyLog.steps_count > 0 && (
                <Section title="Activity">
                    <Metric label="Steps" value={bodyLog.steps_count.toLocaleString()} />
                </Section>
            )}
        </div>
    );
}
