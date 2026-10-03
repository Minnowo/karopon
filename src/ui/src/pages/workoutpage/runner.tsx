import {Fragment} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {StepKind, NewWorkoutLog} from '../../api/types';
import {TagChip} from '../../components/tag_chip';
import {NumberInput} from '../../components/number_input';
import {FormatDuration} from '../../utils/time';
import {UnlockAudioContext} from '../../utils/sound';
import {DEFAULT_CUES, TargetText} from './structure';
import {Cue, StopSpeaking, useWakeLock} from './cues';
import {
    Actuals,
    Back,
    Begin,
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
        CueEvents(last.current.run, next, last.current.now, at, cues.nextSeconds * 1000).forEach((e) => Cue(e, cues));
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

    const begin = () => {
        // Inside the click, since some browsers only allow audio and speech after a user gesture.
        UnlockAudioContext();
        act(Begin);
        Cue({type: 'start', step: run.steps[0], next: run.steps[1] ?? null}, cues);
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
    // Each set is listed once, at the round it is on: done sets at their last, upcoming sets at their first.
    const shownRound = (set: number) =>
        set < st.set ? run.steps.find((x) => x.set === set)!.rounds - 1 : set === st.set ? Math.max(0, st.round) : 0;

    return (
        <div className="surface-1 flex flex-col items-center gap-4 text-center">
            <div className="w-full flex justify-between">
                <small>{run.name}</small>
                <small>
                    Step {run.index + 1} of {run.steps.length}
                </small>
            </div>

            <p>
                {st.between
                    ? run.index === 0
                        ? 'Get ready'
                        : 'Next set'
                    : `${st.set_name || `Set ${st.set + 1}`} - Round ${st.round + 1} of ${st.rounds}`}
            </p>

            <h1>{st.name}</h1>

            {st.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                    {st.tags.map((t) => (
                        <TagChip key={`${t.namespace}:${t.name}`} tag={t} color={p.tagColors.get(t.namespace)} />
                    ))}
                </div>
            )}

            {remaining !== null ? (
                <div className="text-6xl tabular-nums">{clock(remaining, true)}</div>
            ) : (
                <>
                    <div className="text-3xl">{TargetText(st.kind, st.target)}</div>
                    <div className="text-xl tabular-nums">{clock(StepElapsed(run, now), false)}</div>
                </>
            )}

            {paused && !run.waiting && <strong>Paused</strong>}

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

            <small>{next ? `Next: ${stepTitle(next)}` : 'Last step'}</small>

            {run.waiting ? (
                <button className="btn-success text-xl px-8" onClick={begin}>
                    Start
                </button>
            ) : (
                <div className="flex flex-wrap justify-center gap-2">
                    <button disabled={run.index === 0} onClick={() => act(Back)}>
                        Back
                    </button>
                    <button onClick={() => act(paused ? Resume : Pause)}>{paused ? 'Resume' : 'Pause'}</button>
                    <button onClick={() => act(Skip)}>Skip</button>
                </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
                <button className="btn-outlined-error" onClick={discard}>
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
                    if (x.between || x.round !== shownRound(x.set)) {
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
                        <Fragment key={i}>
                            {run.steps[i - 1]?.set !== x.set || run.steps[i - 1]?.round !== x.round ? (
                                <h4 className={`px-2 ${x.set !== run.steps[0].set ? 'pt-3' : ''}`}>
                                    {x.set_name || `Set ${x.set + 1}`}
                                    {x.rounds > 1 ? ` (${x.round + 1}/${x.rounds})` : ''}
                                </h4>
                            ) : null}
                            <div
                                className={`flex justify-between gap-2 px-2 py-1 rounded-sm ${i === run.index ? 'bg-c-surface-container-4' : ''}`}
                            >
                                <span>{i === run.index ? <strong>{stepTitle(x)}</strong> : stepTitle(x)}</span>
                                <small>{status}</small>
                            </div>
                        </Fragment>
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
    const done = shown.filter((st, i) => !st.between && run.progress[i].segments.length > 0).length;
    const total = shown.filter((st) => !st.between).length;
    const activeMs = (run.finished_at ?? run.started_at) - run.started_at - run.paused_ms;

    const setActuals = (i: number, a: Actuals) => {
        const progress = [...run.progress];
        progress[i] = {...progress[i], ...a};
        p.setRun({...run, progress});
    };

    return (
        <div className="surface-1 flex flex-col gap-4">
            <div>
                <h1>{run.completed ? 'Workout complete' : 'Workout ended early'}</h1>
                <small>
                    {run.name} - {FormatDuration(activeMs)} - {done} of {total} steps done
                    {run.paused_ms > 0 ? ` - paused ${FormatDuration(run.paused_ms)}` : ''}
                </small>
            </div>

            <div className="flex flex-col gap-2">
                {shown.map((st, i) => {
                    if (st.between) {
                        return null;
                    }
                    const pr = run.progress[i];
                    const skipped = pr.segments.length === 0;
                    return (
                        <div key={i} className="flex flex-col gap-1">
                            <div className="flex flex-wrap justify-between gap-2">
                                <strong>{stepTitle(st)}</strong>
                                <small>{skipped ? 'skipped' : FormatDuration(ProgressMs(pr))}</small>
                            </div>
                            {!skipped && st.kind !== 'timed' && (
                                <ActualInputs kind={st.kind} value={pr} onChange={(a) => setActuals(i, a)} />
                            )}
                        </div>
                    );
                })}
            </div>

            <label className="flex flex-col gap-1">
                Note
                <textarea rows={2} value={note} placeholder="Note (optional)" onInput={(e) => setNote(e.currentTarget.value)} />
            </label>

            <div className="flex justify-end gap-2">
                <button className="btn-outlined-error" onClick={p.onDiscard}>
                    Discard
                </button>
                <button className="btn-success" onClick={() => p.onSave(BuildWorkoutLog(run, note))}>
                    Save
                </button>
            </div>
        </div>
    );
}
