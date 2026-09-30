import {useState} from 'preact/hooks';
import {TblUserWorkoutStepLog, WorkoutLogWithSteps} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {FormatDuration} from '../../utils/time';
import {TargetText} from './structure';
import {ActualInputs} from './runner';
import {Actuals} from './run_state';

const targetOf = (s: TblUserWorkoutStepLog) =>
    TargetText(s.kind, {
        seconds: s.target_seconds,
        reps: s.target_reps,
        weight: s.target_weight,
        distance: s.target_distance,
        unit: s.unit,
    });

const actualOf = (s: TblUserWorkoutStepLog) =>
    s.kind === 'timed'
        ? ''
        : TargetText(s.kind, {
              seconds: 0,
              reps: s.actual_reps,
              weight: s.actual_weight,
              distance: s.actual_distance,
              unit: s.unit,
          });

type WorkoutLogPanelProps = {
    log: WorkoutLogWithSteps;
    hour12: boolean;
    updateLog: (log: WorkoutLogWithSteps) => void;
    deleteLog: (log: WorkoutLogWithSteps) => void;
};

export function WorkoutLogPanel({log, hour12, updateLog, deleteLog}: WorkoutLogPanelProps) {
    const [draft, setDraft] = useState<WorkoutLogWithSteps | null>(null);
    const {workoutlog} = log;
    const shown = draft ?? log;
    const activeMs = workoutlog.stop_time - workoutlog.start_time - workoutlog.paused_ms;

    const setActuals = (i: number, a: Actuals) =>
        setDraft((d) => d && {...d, steps: d.steps.map((s, j) => (j === i ? {...s, ...a} : s))});

    return (
        <div className="w-full surface-1 flex items-start gap-2">
            <details className="flex-1" open={draft !== null ? true : undefined}>
                <summary className="cursor-pointer">
                    <h2 className="inline">{workoutlog.name}</h2>
                    <small className="block">
                        {new Date(workoutlog.start_time).toLocaleString(undefined, {hour12})} - {FormatDuration(activeMs)} -{' '}
                        {workoutlog.completed ? 'completed' : 'ended early'}
                    </small>
                </summary>

                <div className="flex flex-col gap-2 pt-2">
                    {shown.steps.map((s, i) => (
                        <div key={s.id} className="flex flex-col gap-1">
                            <div className="flex flex-wrap justify-between gap-2">
                                <span>
                                    <strong>{s.name}</strong> - {targetOf(s)}
                                </span>
                                <small>
                                    {s.actual_seconds === 0 ? 'skipped' : FormatDuration(s.actual_seconds * 1000)}
                                    {draft === null && actualOf(s) && s.actual_seconds > 0 ? ` - did ${actualOf(s)}` : ''}
                                </small>
                            </div>
                            {draft !== null && s.actual_seconds > 0 && s.kind !== 'timed' && (
                                <ActualInputs kind={s.kind} value={s} onChange={(a) => setActuals(i, a)} />
                            )}
                        </div>
                    ))}

                    {draft !== null ? (
                        <>
                            <label className="flex flex-col gap-1">
                                Note
                                <textarea
                                    rows={2}
                                    value={draft.workoutlog.note}
                                    onInput={(e) => {
                                        const note = e.currentTarget.value;
                                        setDraft((d) => d && {...d, workoutlog: {...d.workoutlog, note}});
                                    }}
                                />
                            </label>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setDraft(null)}>Cancel</button>
                                <button
                                    className="btn-success"
                                    onClick={() => {
                                        updateLog(draft);
                                        setDraft(null);
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </>
                    ) : (
                        workoutlog.note && <p>{workoutlog.note}</p>
                    )}
                </div>
            </details>
            <DropdownButton
                actions={[
                    {label: 'Edit', onClick: () => setDraft(structuredClone(log))},
                    {label: 'Delete', dangerous: true, onClick: () => deleteLog(log)},
                ]}
            />
        </div>
    );
}
