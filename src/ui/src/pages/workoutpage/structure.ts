import {StepKind, TblUserTag} from '../../api/types';

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

export type WorkoutStructure = {
    v: 1;
    sets: WorkoutSet[];
};

export const EmptyStructure = (): WorkoutStructure => ({v: 1, sets: []});

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
            return parsed;
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
