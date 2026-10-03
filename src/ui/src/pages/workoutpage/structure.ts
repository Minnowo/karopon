import {ExerciseWithTags, StepKind, TblUserTag, WorkoutWithTags} from '../../api/types';
import {TagToString} from '../../utils/tags';

export type WorkoutStep = {
    exercise_id: number;
    kind: StepKind;
    seconds: number;
    reps: number;
    weight: number;
    distance: number;
    unit: string;
};

export type WorkoutSet = {
    name: string;
    tags: TblUserTag[];
    rounds: number;
    steps: WorkoutStep[];
};

// What the runner plays for this workout.
export type CueSettings = {
    beeps: boolean;
    sayStep: boolean;
    sayNext: boolean;
    nextSeconds: number;
    sayCountdown: boolean;
    saySetStart: boolean;
    saySetEnd: boolean;
    sayDone: boolean;
    // Wait between sets, 0 for none.
    betweenSetsSeconds: number;
};

export const DEFAULT_CUES: CueSettings = {
    beeps: true,
    sayStep: true,
    sayNext: true,
    nextSeconds: 5,
    sayCountdown: true,
    saySetStart: false,
    saySetEnd: false,
    sayDone: false,
    betweenSetsSeconds: 0,
};

export type WorkoutStructure = {
    v: 1;
    sets: WorkoutSet[];
    cues: CueSettings;
};

export const EmptyStructure = (): WorkoutStructure => ({v: 1, sets: [], cues: {...DEFAULT_CUES}});

export const STEP_KIND_LABELS: Record<StepKind, string> = {
    timed: 'Timed',
    reps: 'Reps',
    weighted: 'Weighted reps',
    distance: 'Distance',
};

export const NewWorkoutStep = (exerciseID: number): WorkoutStep => ({
    exercise_id: exerciseID,
    kind: 'timed',
    seconds: 30,
    reps: 10,
    weight: 0,
    distance: 0,
    unit: '',
});

export const NewWorkoutSet = (): WorkoutSet => ({name: '', tags: [], rounds: 1, steps: []});

export const ParseStructure = (s: string): WorkoutStructure => {
    try {
        const parsed = JSON.parse(s) as WorkoutStructure;
        if (parsed && Array.isArray(parsed.sets)) {
            return {...parsed, cues: {...DEFAULT_CUES, ...parsed.cues}};
        }
    } catch {
        // fall through
    }
    return EmptyStructure();
};

export const StringifyStructure = (s: WorkoutStructure): string => JSON.stringify(s);

// Workout, set, then exercise tags, without duplicates.
export const StepTags = (workoutTags: TblUserTag[], setLevelTags: TblUserTag[], exerciseTags: TblUserTag[]): TblUserTag[] => {
    const seen = new Set<string>();
    const out: TblUserTag[] = [];
    for (const t of [...workoutTags, ...setLevelTags, ...exerciseTags]) {
        const key = `${t.namespace}:${t.name}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(t);
        }
    }
    return out;
};

// Short text for a step target, e.g. "20s", "10 reps", "8 x 60 kg", "5 km".
export const TargetText = (kind: StepKind, t: Pick<WorkoutStep, 'seconds' | 'reps' | 'weight' | 'distance' | 'unit'>): string => {
    switch (kind) {
        case 'timed':
            return `${t.seconds}s`;
        case 'reps':
            return `${t.reps} reps`;
        case 'weighted':
            return `${t.reps} x ${t.weight} ${t.unit}`.trim();
        case 'distance':
            return `${t.distance} ${t.unit}`.trim();
    }
};

const tagsLine = (tags: TblUserTag[]): string | null => (tags.length > 0 ? `Tags: ${tags.map(TagToString).join(', ')}` : null);

export const ExerciseText = ({exercise, tags}: ExerciseWithTags): string =>
    [exercise.name, tagsLine(tags), exercise.note ? `Note: ${exercise.note}` : null].filter((x) => x !== null).join('\n');

export const WorkoutText = ({workout, tags}: WorkoutWithTags, exercises: ExerciseWithTags[]): string => {
    const exMap = new Map(exercises.map((e) => [e.exercise.id, e]));
    const s = ParseStructure(workout.structure);

    const lines = [workout.name, tagsLine(tags), workout.note ? `Note: ${workout.note}` : null].filter((x) => x !== null);

    s.sets.forEach((set, i) => {
        lines.push('', `${set.name || `Set ${i + 1}`}${set.rounds > 1 ? ` (x${set.rounds})` : ''}`);
        const setTags = tagsLine(set.tags);
        if (setTags) {
            lines.push(setTags);
        }
        for (const st of set.steps) {
            const ex = exMap.get(st.exercise_id);
            lines.push(`  ${ex ? ex.exercise.name : '(deleted exercise)'} - ${TargetText(st.kind, st)}`);
        }
    });

    return lines.join('\n');
};
