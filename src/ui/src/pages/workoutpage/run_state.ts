import {StepKind, ExerciseWithTags, NewWorkoutLog, TblUserTag, TimeSegment, WorkoutWithTags} from '../../api/types';
import {CueSettings, ParseStructure, StepTags, WorkoutStep} from './structure';

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
    cues: CueSettings;
};

// How long before a timed step ends the next step is announced.
const NEXT_CUE_MS = 5000;

export type CueEvent =
    | {type: 'start'; step: RunStep}
    | {type: 'next'; step: RunStep; next: RunStep}
    | {type: 'countdown'; step: RunStep; secondsLeft: 3 | 2 | 1}
    | {type: 'step'; step: RunStep; next: RunStep | null}
    | {type: 'done'};

// Returns null when the workout has no runnable steps.
export const StartRun = (w: WorkoutWithTags, exercises: ExerciseWithTags[], now: number): RunState | null => {
    const exMap = new Map(exercises.map((e) => [e.exercise.id, e]));
    const steps: RunStep[] = [];
    const structure = ParseStructure(w.workout.structure);

    structure.sets.forEach((b, setIdx) => {
        for (let round = 0; round < b.rounds; round++) {
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
                });
            });
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
        paused_at: null,
        paused_ms: 0,
        furthest: 0,
        current: [],
        segment_start: now,
        progress: steps.map(() => ({segments: [], actual_reps: 0, actual_weight: 0, actual_distance: 0})),
        finished_at: null,
        completed: false,
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
export const CueEvents = (prev: RunState, next: RunState, prevNow: number, now: number): CueEvent[] => {
    if (next.finished_at !== null) {
        return prev.finished_at === null && next.completed ? [{type: 'done'}] : [];
    }
    if (next.index !== prev.index) {
        return [{type: 'step', step: next.steps[next.index], next: next.steps[next.index + 1] ?? null}];
    }
    const before = StepRemaining(prev, prevNow);
    const after = StepRemaining(next, now);
    if (before === null || after === null) {
        return [];
    }
    const upcoming = next.steps[next.index + 1];
    if (upcoming && before > NEXT_CUE_MS && after <= NEXT_CUE_MS) {
        return [{type: 'next', step: next.steps[next.index], next: upcoming}];
    }
    for (const n of [3, 2, 1] as const) {
        if (before > n * 1000 && after <= n * 1000) {
            return [{type: 'countdown', step: next.steps[next.index], secondsLeft: n}];
        }
    }
    return [];
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
    steps: s.steps.slice(0, s.furthest + 1).map((st, i) => {
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
