import {useEffect, useRef, useState} from 'preact/hooks';
import {StepKind, NewWorkoutLog} from '../../api/types';
import {TagChip} from '../../components/tag_chip';
import {NumberInput} from '../../components/number_input';
import {FormatDuration} from '../../utils/time';
import {DEFAULT_CUES, TargetText} from './structure';
import {Cue, StopSpeaking, useWakeLock} from './cues';
import {
    Actuals,
    Back,
    BuildWorkoutLog,
    CompleteStep,
    CueEvents,
    Finish,
    Pause,
    ProgressMs,
    Resume,
    RunState,
    RunStep,
    Skip,
    StepElapsed,
    StepRemaining,
    Tick,
} from './run_state';

const clock = (ms: number, roundUp: boolean): string => {
    const total = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const stepTitle = (st: RunStep) => `${st.name} - ${TargetText(st.kind, st.target)}`;

type ActualInputsProps = {
    kind: StepKind;
    value: Actuals;
    onChange: (a: Actuals) => void;
};

export function ActualInputs({kind, value, onChange}: ActualInputsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {(kind === 'reps' || kind === 'weighted') && (
                <NumberInput
                    label="Reps"
                    min={0}
                    precision={0}
                    value={value.actual_reps}
                    onValueChange={(v) => onChange({...value, actual_reps: v})}
                />
            )}
            {kind === 'weighted' && (
                <NumberInput
                    label="Weight"
                    min={0}
                    precision={2}
                    value={value.actual_weight}
                    onValueChange={(v) => onChange({...value, actual_weight: v})}
                />
            )}
            {kind === 'distance' && (
                <NumberInput
                    label="Distance"
                    min={0}
                    precision={2}
                    value={value.actual_distance}
                    onValueChange={(v) => onChange({...value, actual_distance: v})}
                />
            )}
        </div>
    );
}

type RunnerProps = {
    run: RunState;
    setRun: (s: RunState) => void;
    tagColors: Map<string, string>;
    onSave: (log: NewWorkoutLog) => void;
    onDiscard: () => void;
};

export function Runner(p: RunnerProps) {
    const {run} = p;
    const running = run.finished_at === null;
    const [now, setNow] = useState<number>(() => Date.now());
    const [doneInput, setDoneInput] = useState<Actuals | null>(null);
    const last = useRef<{run: RunState; now: number}>({run, now});

    // Runs saved before cue settings existed have none.
    const cues = {...DEFAULT_CUES, ...run.cues};

    useWakeLock(running);

    useEffect(() => StopSpeaking, []);

    // Faster than useTimeNow so the countdown and beeps land close to the second.
    useEffect(() => {
        if (!running) {
            return;
        }
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, [running]);

    const apply = (next: RunState, at: number) => {
        CueEvents(last.current.run, next, last.current.now, at).forEach((e) => Cue(e, cues));
        last.current = {run: next, now: at};
        if (next !== run) {
            p.setRun(next);
        }
    };

    useEffect(() => {
        if (running) {
            apply(Tick(run, now), now);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [now]);

    const act = (fn: (s: RunState, at: number) => RunState) => {
        const at = Date.now();
        setDoneInput(null);
        apply(fn(Tick(run, at), at), at);
    };

    const discard = () => {
        if (confirm('Discard this workout? Nothing will be saved.')) {
            p.onDiscard();
        }
    };

    if (!running) {
        return <RunSummary {...p} onDiscard={discard} />;
    }

    const st = run.steps[run.index];
    const next = run.steps[run.index + 1];
    const remaining = StepRemaining(run, now);
    const paused = run.paused_at !== null;

    return (
        <div className="surface-1 rounded-sm p-4 flex flex-col items-center gap-4 text-center">
            <div className="w-full flex justify-between text-sm text-c-on-surface-variant">
                <span>{run.name}</span>
                <span>
                    Step {run.index + 1} of {run.steps.length}
                </span>
            </div>

            <div className="text-sm">
                {st.set_name || `Set ${st.set + 1}`} - Round {st.round + 1} of {st.rounds}
            </div>

            <h1 className="mb-0">{st.name}</h1>

            {st.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                    {st.tags.map((t) => (
                        <TagChip key={`${t.namespace}:${t.name}`} tag={t} color={p.tagColors.get(t.namespace)} />
                    ))}
                </div>
            )}

            {remaining !== null ? (
                <div className="text-6xl font-bold tabular-nums">{clock(remaining, true)}</div>
            ) : (
                <>
                    <div className="text-3xl font-bold">{TargetText(st.kind, st.target)}</div>
                    <div className="text-xl tabular-nums">{clock(StepElapsed(run, now), false)}</div>
                </>
            )}

            {paused && <div className="font-semibold">Paused</div>}

            {doneInput !== null ? (
                <div className="flex flex-col items-center gap-2">
                    <ActualInputs kind={st.kind} value={doneInput} onChange={setDoneInput} />
                    <div className="flex gap-2">
                        <button onClick={() => setDoneInput(null)}>Cancel</button>
                        <button className="btn-success" onClick={() => act((s, at) => CompleteStep(s, at, doneInput))}>
                            Confirm
                        </button>
                    </div>
                </div>
            ) : (
                remaining === null && (
                    <button
                        className="btn-success text-xl px-8"
                        onClick={() =>
                            setDoneInput({
                                actual_reps: st.target.reps,
                                actual_weight: st.target.weight,
                                actual_distance: st.target.distance,
                            })
                        }
                    >
                        Done
                    </button>
                )
            )}

            <div className="text-sm text-c-on-surface-variant">{next ? `Next: ${stepTitle(next)}` : 'Last step'}</div>

            <div className="flex flex-wrap justify-center gap-2">
                <button disabled={run.index === 0} onClick={() => act(Back)}>
                    Back
                </button>
                <button onClick={() => act(paused ? Resume : Pause)}>{paused ? 'Resume' : 'Pause'}</button>
                <button onClick={() => act(Skip)}>Skip</button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
                <button className="btn-error" onClick={discard}>
                    Discard
                </button>
                <button
                    className="btn-success"
                    onClick={() => {
                        if (confirm('Finish now? What you have done so far will be saved.')) {
                            act(Finish);
                        }
                    }}
                >
                    Finish
                </button>
            </div>

            <div className="w-full surface-2 flex flex-col text-left">
                {run.steps.map((x, i) => {
                    if (x.set !== st.set || x.round !== st.round) {
                        return null;
                    }
                    const pr = run.progress[i];
                    const status =
                        i === run.index
                            ? 'now'
                            : pr.segments.length > 0
                              ? FormatDuration(ProgressMs(pr))
                              : i <= run.furthest
                                ? 'skipped'
                                : '';
                    return (
                        <div
                            key={i}
                            className={`flex justify-between gap-2 px-2 py-1 rounded ${i === run.index ? 'font-bold bg-c-surface-container-4' : ''}`}
                        >
                            <span>{stepTitle(x)}</span>
                            <span className="text-sm text-c-on-surface-variant">{status}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RunSummary(p: RunnerProps) {
    const {run} = p;
    const [note, setNote] = useState<string>('');

    const shown = run.steps.slice(0, run.furthest + 1);
    const done = shown.filter((_, i) => run.progress[i].segments.length > 0).length;
    const activeMs = (run.finished_at ?? run.started_at) - run.started_at - run.paused_ms;

    const setActuals = (i: number, a: Actuals) => {
        const progress = [...run.progress];
        progress[i] = {...progress[i], ...a};
        p.setRun({...run, progress});
    };

    return (
        <div className="surface-1 rounded-sm p-4 flex flex-col gap-4">
            <div>
                <h1 className="mb-0">{run.completed ? 'Workout complete' : 'Workout ended early'}</h1>
                <div className="text-sm text-c-on-surface-variant">
                    {run.name} - {FormatDuration(activeMs)} - {done} of {shown.length} steps done
                    {run.paused_ms > 0 ? ` - paused ${FormatDuration(run.paused_ms)}` : ''}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {shown.map((st, i) => {
                    const pr = run.progress[i];
                    const skipped = pr.segments.length === 0;
                    return (
                        <div key={i} className="border-t border-c-outline-variant pt-2 flex flex-col gap-1">
                            <div className="flex flex-wrap justify-between gap-2">
                                <span className="font-semibold">{stepTitle(st)}</span>
                                <span className="text-sm text-c-on-surface-variant">
                                    {skipped ? 'skipped' : FormatDuration(ProgressMs(pr))}
                                </span>
                            </div>
                            {!skipped && st.kind !== 'timed' && (
                                <ActualInputs kind={st.kind} value={pr} onChange={(a) => setActuals(i, a)} />
                            )}
                        </div>
                    );
                })}
            </div>

            <label className="block">
                <span className="font-semibold">Note</span>
                <textarea
                    className="w-full"
                    rows={2}
                    value={note}
                    placeholder="Note (optional)"
                    onInput={(e) => setNote(e.currentTarget.value)}
                />
            </label>

            <div className="flex justify-end gap-2">
                <button className="btn-error" onClick={p.onDiscard}>
                    Discard
                </button>
                <button className="btn-success" onClick={() => p.onSave(BuildWorkoutLog(run, note))}>
                    Save
                </button>
            </div>
        </div>
    );
}
