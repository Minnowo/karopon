import {StepKind, ExerciseWithTags, NewWorkoutLog, TblUserTag, TimeSegment, WorkoutWithTags} from '../../api/types';
import {CueSettings, NewWorkoutStep, ParseStructure, StepTags, WorkoutSet, WorkoutStep} from './structure';

export type RunStep = {
    exercise_id: number;
    name: string;
    kind: StepKind;
    set: number;
    set_name: string;
    round: number;
    rounds: number;
    step: number;
    // Tags for the timespan, empty when the step should not create one.
    tags: TblUserTag[];
    target: WorkoutStep;
    // Wait before a set or round, not part of the workout and not logged.
    // Waits before a set have round -1.
    between: boolean;
};

export type StepProgress = {
    segments: TimeSegment[];
    actual_reps: number;
    actual_weight: number;
    actual_distance: number;
};

export type Actuals = Pick<StepProgress, 'actual_reps' | 'actual_weight' | 'actual_distance'>;

export type RunState = {
    workout_id: number;
    name: string;
    steps: RunStep[];
    index: number;
    started_at: number;
    paused_at: number | null;
    paused_ms: number;
    furthest: number;
    // Closed segments of the step in progress.
    current: TimeSegment[];
    // Start of the open segment, null while paused.
    segment_start: number | null;
    progress: StepProgress[];
    // Set when the run is over and the summary is showing.
    finished_at: number | null;
    completed: boolean;
    // Opened but not started yet.
    waiting: boolean;
    cues: CueSettings;
};

const LEAD_IN_SECONDS = 10;

export type CueEvent =
    | {type: 'start'; step: RunStep; next: RunStep | null}
    | {type: 'next'; step: RunStep; next: RunStep}
    | {type: 'countdown'; step: RunStep; secondsLeft: 3 | 2 | 1}
    | {type: 'step'; step: RunStep; next: RunStep | null; setEnded: RunStep | null; setStarted: boolean}
    | {type: 'done'; last: RunStep};

// Returns null when the workout has no runnable steps.
export const StartRun = (w: WorkoutWithTags, exercises: ExerciseWithTags[], now: number): RunState | null => {
    const exMap = new Map(exercises.map((e) => [e.exercise.id, e]));
    const steps: RunStep[] = [];
    const structure = ParseStructure(w.workout.structure);

    const gap = (b: WorkoutSet, setIdx: number, round: number, seconds: number): RunStep => ({
        exercise_id: 0,
        name: round < 0 ? b.name || `Set ${setIdx + 1}` : `Round ${round + 1} of ${b.rounds}`,
        kind: 'timed',
        set: setIdx,
        set_name: b.name,
        round,
        rounds: b.rounds,
        step: -1,
        tags: [],
        target: {...NewWorkoutStep(0), seconds},
        between: true,
    });

    structure.sets.forEach((b, setIdx) => {
        const setStart = steps.length;
        for (let round = 0; round < b.rounds; round++) {
            if (round > 0 && b.betweenRoundsSeconds > 0 && steps.length > setStart) {
                steps.push(gap(b, setIdx, round, b.betweenRoundsSeconds));
            }
            b.steps.forEach((st, stepIdx) => {
                const ex = exMap.get(st.exercise_id);
                if (!ex) {
                    return;
                }
                const recordTime = st.kind === 'timed' && ex.tags.length > 0;
                steps.push({
                    exercise_id: ex.exercise.id,
                    name: ex.exercise.name,
                    kind: st.kind,
                    set: setIdx,
                    set_name: b.name,
                    round,
                    rounds: b.rounds,
                    step: stepIdx,
                    tags: recordTime ? StepTags(w.tags, b.tags, ex.tags) : [],
                    target: st,
                    between: false,
                });
            });
        }
        if (steps.length === setStart) {
            return;
        }
        if (setStart === 0) {
            steps.unshift(gap(b, setIdx, -1, LEAD_IN_SECONDS));
        } else if (structure.cues.betweenSetsSeconds > 0) {
            steps.splice(setStart, 0, gap(b, setIdx, -1, structure.cues.betweenSetsSeconds));
        }
    });

    if (steps.length === 0) {
        return null;
    }

    return {
        workout_id: w.workout.id,
        name: w.workout.name,
        steps,
        index: 0,
        started_at: now,
        paused_ms: 0,
        furthest: 0,
        current: [],
        segment_start: null,
        paused_at: now,
        progress: steps.map(() => ({segments: [], actual_reps: 0, actual_weight: 0, actual_distance: 0})),
        finished_at: null,
        completed: false,
        waiting: true,
        cues: structure.cues,
    };
};

const segmentsMs = (segs: TimeSegment[]) => segs.reduce((sum, s) => sum + (s.stop_time - s.start_time), 0);

export const StepElapsed = (s: RunState, now: number): number =>
    segmentsMs(s.current) + (s.segment_start !== null ? now - s.segment_start : 0);

// Remaining ms of a timed step, or null for other kinds.
export const StepRemaining = (s: RunState, now: number): number | null => {
    const st = s.steps[s.index];
    return st.kind === 'timed' ? st.target.seconds * 1000 - StepElapsed(s, now) : null;
};

export const ProgressMs = (p: StepProgress): number => segmentsMs(p.segments);

const closeSegment = (s: RunState, at: number): TimeSegment[] =>
    s.segment_start !== null && at > s.segment_start ? [...s.current, {start_time: s.segment_start, stop_time: at}] : s.current;

const enterStep = (s: RunState, i: number, now: number): RunState => {
    if (i >= s.steps.length) {
        return {...s, current: [], segment_start: null, finished_at: now, completed: true};
    }
    return {
        ...s,
        index: i,
        furthest: Math.max(s.furthest, i),
        current: [],
        segment_start: s.paused_at === null ? now : null,
    };
};

export const Begin = (s: RunState, now: number): RunState => ({
    ...s,
    waiting: false,
    started_at: now,
    paused_at: null,
    paused_ms: 0,
    segment_start: now,
});

export const Pause = (s: RunState, now: number): RunState =>
    s.paused_at !== null ? s : {...s, current: closeSegment(s, now), segment_start: null, paused_at: now};

export const Resume = (s: RunState, now: number): RunState =>
    s.paused_at === null ? s : {...s, paused_ms: s.paused_ms + (now - s.paused_at), paused_at: null, segment_start: now};

// Keeps the step's time and moves to the next step. Replaces any earlier attempt at the step.
export const CompleteStep = (s: RunState, now: number, actuals?: Actuals): RunState => {
    const progress = [...s.progress];
    const p = progress[s.index];
    progress[s.index] = {...p, ...actuals, segments: closeSegment(s, now)};
    return enterStep({...s, progress}, s.index + 1, now);
};

// Skip and Back throw away the time of the step in progress.
export const Skip = (s: RunState, now: number): RunState => enterStep(s, s.index + 1, now);

export const Back = (s: RunState, now: number): RunState => enterStep(s, Math.max(0, s.index - 1), now);

// Ends the run early, keeping the time done so far on the current step.
// That replaces an earlier attempt at the step, unless no time was spent on this one.
export const Finish = (s: RunState, now: number): RunState => {
    const progress = [...s.progress];
    const p = progress[s.index];
    const current = closeSegment(s, now);
    progress[s.index] = {...p, segments: current.length > 0 ? current : p.segments};
    const paused_ms = s.paused_at !== null ? s.paused_ms + (now - s.paused_at) : s.paused_ms;
    return {
        ...s,
        progress,
        paused_ms,
        paused_at: null,
        current: [],
        segment_start: null,
        finished_at: now,
        completed: false,
    };
};

// Completes any timed steps that ran out, at their exact end time. Returns s unchanged if nothing ended.
export const Tick = (s: RunState, now: number): RunState => {
    let cur = s;
    while (cur.finished_at === null && cur.segment_start !== null) {
        const remaining = StepRemaining(cur, now);
        if (remaining === null || remaining > 0) {
            break;
        }
        cur = CompleteStep(cur, now + remaining);
    }
    return cur;
};

// Sound cues for moving from prev at prevNow to next at now.
export const CueEvents = (prev: RunState, next: RunState, prevNow: number, now: number, nextCueMs: number): CueEvent[] => {
    if (next.finished_at !== null) {
        return prev.finished_at === null && next.completed ? [{type: 'done', last: next.steps[next.steps.length - 1]}] : [];
    }
    if (next.index !== prev.index) {
        const step = next.steps[next.index];
        const before = next.index > prev.index ? next.steps[next.index - 1] : undefined;
        const setGap = (x: RunStep) => x.between && x.round < 0;
        const crossed = before !== undefined && (before.set !== step.set || setGap(before) || setGap(step));
        return [
            {
                type: 'step',
                step,
                next: next.steps[next.index + 1] ?? null,
                setEnded: crossed && !before.between ? before : null,
                setStarted: crossed && !step.between,
            },
        ];
    }
    const before = StepRemaining(prev, prevNow);
    const after = StepRemaining(next, now);
    if (before === null || after === null) {
        return [];
    }
    const events: CueEvent[] = [];
    const upcoming = next.steps[next.index + 1];
    const step = next.steps[next.index];
    // Steps shorter than the cue time get it at their midpoint.
    const cueAt = Math.min(nextCueMs, (step.target.seconds * 1000) / 2);
    if (upcoming && !step.between && before > cueAt && after <= cueAt) {
        events.push({type: 'next', step: next.steps[next.index], next: upcoming});
    }
    for (const n of [3, 2, 1] as const) {
        if (before > n * 1000 && after <= n * 1000) {
            events.push({type: 'countdown', step: next.steps[next.index], secondsLeft: n});
            break;
        }
    }
    return events;
};

export const BuildWorkoutLog = (s: RunState, note: string): NewWorkoutLog => ({
    workoutlog: {
        id: 0,
        user_id: 0,
        workout_id: s.workout_id,
        created: 0,
        name: s.name,
        start_time: s.started_at,
        stop_time: s.finished_at ?? s.started_at,
        paused_ms: s.paused_ms,
        completed: s.completed,
        note,
    },
    steps: s.steps.slice(0, s.furthest + 1).flatMap((st, i) => {
        if (st.between) {
            return [];
        }
        const p = s.progress[i];
        return {
            step: {
                id: 0,
                user_id: 0,
                workoutlog_id: 0,
                exercise_id: st.exercise_id,
                name: st.name,
                kind: st.kind,
                set: st.set + 1,
                round: st.round + 1,
                step: st.step + 1,
                target_seconds: st.kind === 'timed' ? st.target.seconds : 0,
                target_reps: st.kind === 'reps' || st.kind === 'weighted' ? st.target.reps : 0,
                target_weight: st.kind === 'weighted' ? st.target.weight : 0,
                target_distance: st.kind === 'distance' ? st.target.distance : 0,
                actual_reps: p.actual_reps,
                actual_weight: p.actual_weight,
                actual_distance: p.actual_distance,
                unit: st.kind === 'weighted' || st.kind === 'distance' ? st.target.unit : '',
                actual_seconds: Math.round(ProgressMs(p) / 1000),
            },
            segments: p.segments,
            tags: p.segments.length > 0 ? st.tags : [],
        };
    }),
});
