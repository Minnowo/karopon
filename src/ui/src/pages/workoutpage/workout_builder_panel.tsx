import {Dispatch, StateUpdater, useMemo, useState} from 'preact/hooks';
import {ExerciseWithTags, StepKind, StepKindValues, TblUserTag, WorkoutWithTags} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {TagChip} from '../../components/tag_chip';
import {NumberInput} from '../../components/number_input';
import {FuzzySearch} from '../../components/select_list';
import {ErrorDiv} from '../../components/error_div';
import {DownArrow, UpArrow} from '../../components/svg';
import {FormatDuration} from '../../utils/time';
import {
    CueSettings,
    EmptyStructure,
    NewWorkoutSet,
    NewWorkoutStep,
    ParseStructure,
    STEP_KIND_LABELS,
    StringifyStructure,
    WorkoutSet,
    WorkoutStep,
    WorkoutStructure,
} from './structure';

type WorkoutBuilderPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors: Map<string, string>;
    exercises: ExerciseWithTags[];
    title: string;
    submitLabel: string;
    initial?: WorkoutWithTags;
    onSubmit: (w: WorkoutWithTags) => void;
    onCancel: () => void;
    className?: string;
};

const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) {
        return arr;
    }
    const out = [...arr];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
};

// Total time of timed steps and total step count, with rounds applied.
export const StructureSummary = (s: WorkoutStructure): string => {
    let ms = 0;
    let steps = 0;
    for (const b of s.sets) {
        steps += b.rounds * b.steps.length;
        for (const st of b.steps) {
            if (st.kind === 'timed') {
                ms += b.rounds * st.seconds * 1000;
            }
        }
    }
    return `${steps} steps, ${FormatDuration(ms)} timed`;
};

const CUE_OPTIONS: Array<{key: keyof CueSettings; label: string}> = [
    {key: 'beeps', label: 'Beeps'},
    {key: 'sayStep', label: 'Say each exercise as it starts'},
    {key: 'sayNext', label: 'Say the next exercise 5 seconds before'},
    {key: 'sayCountdown', label: 'Count down 3, 2, 1'},
];

export function WorkoutBuilderPanel(p: WorkoutBuilderPanelProps) {
    const [name, setName] = useState<string>(p.initial?.workout.name ?? '');
    const [note, setNote] = useState<string>(p.initial?.workout.note ?? '');
    const [tags, setTags] = useState<TblUserTag[]>(p.initial?.tags ?? []);
    const [structure, setStructure] = useState<WorkoutStructure>(() =>
        p.initial ? ParseStructure(p.initial.workout.structure) : {...EmptyStructure(), sets: [NewWorkoutSet()]}
    );
    const [queries, setQueries] = useState<string[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const exerciseMap = useMemo(() => new Map(p.exercises.map((e) => [e.exercise.id, e])), [p.exercises]);

    const updateSets = (fn: (sets: WorkoutSet[]) => WorkoutSet[]) => setStructure((s) => ({...s, sets: fn(s.sets)}));

    const updateSet = (i: number, fn: (b: WorkoutSet) => WorkoutSet) =>
        updateSets((sets) => sets.map((b, j) => (j === i ? fn(b) : b)));

    const updateStep = (setIdx: number, stepIdx: number, patch: Partial<WorkoutStep>) =>
        updateSet(setIdx, (b) => ({...b, steps: b.steps.map((st, j) => (j === stepIdx ? {...st, ...patch} : st))}));

    const setQuery = (setIdx: number, q: string) =>
        setQueries((qs) => {
            const out = [...qs];
            out[setIdx] = q;
            return out;
        });

    const onSaveClick = () => {
        const trimmedName = name.trim();

        if (trimmedName === '') {
            setErrorMsg('Workout cannot have an empty name');
            return;
        }

        p.onSubmit({
            workout: {
                id: p.initial?.workout.id ?? 0,
                user_id: 0,
                name: trimmedName,
                note,
                structure: StringifyStructure(structure),
            },
            tags,
        });
    };

    const renderTargets = (setIdx: number, stepIdx: number, st: WorkoutStep) => {
        const kind = st.kind;
        return (
            <div className="flex flex-wrap items-center gap-2">
                {kind === 'timed' && (
                    <NumberInput
                        label="Seconds"
                        min={1}
                        precision={0}
                        value={st.seconds}
                        onValueChange={(v) => updateStep(setIdx, stepIdx, {seconds: v})}
                    />
                )}
                {(kind === 'reps' || kind === 'weighted') && (
                    <NumberInput
                        label="Reps"
                        min={1}
                        precision={0}
                        value={st.reps}
                        onValueChange={(v) => updateStep(setIdx, stepIdx, {reps: v})}
                    />
                )}
                {kind === 'weighted' && (
                    <NumberInput
                        label="Weight"
                        min={0}
                        precision={2}
                        value={st.weight}
                        onValueChange={(v) => updateStep(setIdx, stepIdx, {weight: v})}
                    />
                )}
                {kind === 'distance' && (
                    <NumberInput
                        label="Distance"
                        min={0}
                        precision={2}
                        value={st.distance}
                        onValueChange={(v) => updateStep(setIdx, stepIdx, {distance: v})}
                    />
                )}
                {(kind === 'weighted' || kind === 'distance') && (
                    <input
                        className="w-16"
                        type="text"
                        value={st.unit}
                        placeholder={kind === 'weighted' ? 'kg' : 'km'}
                        aria-label="Unit"
                        onInput={(e) => updateStep(setIdx, stepIdx, {unit: e.currentTarget.value})}
                    />
                )}
            </div>
        );
    };

    const renderStep = (setIdx: number, stepIdx: number, st: WorkoutStep, count: number) => {
        const ex = exerciseMap.get(st.exercise_id);
        return (
            <div key={stepIdx} className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4>{ex ? ex.exercise.name : '(deleted exercise)'}</h4>
                        <select
                            value={st.kind}
                            aria-label="Step kind"
                            onChange={(e) => updateStep(setIdx, stepIdx, {kind: e.currentTarget.value as StepKind})}
                        >
                            {StepKindValues.map((k) => (
                                <option key={k} value={k}>
                                    {STEP_KIND_LABELS[k]}
                                </option>
                            ))}
                        </select>
                        {ex?.tags.map((t) => (
                            <TagChip key={`${t.namespace}:${t.name}`} tag={t} color={p.tagColors.get(t.namespace)} />
                        ))}
                    </div>
                    {renderTargets(setIdx, stepIdx, st)}
                </div>
                <div className="flex gap-1">
                    <button
                        disabled={stepIdx === 0}
                        aria-label="Move step up"
                        onClick={() => updateSet(setIdx, (b) => ({...b, steps: move(b.steps, stepIdx, -1)}))}
                    >
                        {UpArrow}
                    </button>
                    <button
                        disabled={stepIdx === count - 1}
                        aria-label="Move step down"
                        onClick={() => updateSet(setIdx, (b) => ({...b, steps: move(b.steps, stepIdx, 1)}))}
                    >
                        {DownArrow}
                    </button>
                    <button
                        aria-label={ex ? `Duplicate ${ex.exercise.name}` : 'Duplicate step'}
                        onClick={() =>
                            updateSet(setIdx, (b) => ({
                                ...b,
                                steps: [...b.steps.slice(0, stepIdx + 1), {...st}, ...b.steps.slice(stepIdx + 1)],
                            }))
                        }
                    >
                        Duplicate
                    </button>
                    <button
                        className="btn-outlined-error"
                        aria-label={ex ? `Remove ${ex.exercise.name}` : 'Remove step'}
                        onClick={() => updateSet(setIdx, (b) => ({...b, steps: b.steps.filter((_, j) => j !== stepIdx)}))}
                    >
                        X
                    </button>
                </div>
            </div>
        );
    };

    const renderSet = (b: WorkoutSet, setIdx: number) => (
        <div key={setIdx} className="surface-2 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    className="flex-1 min-w-32"
                    type="text"
                    value={b.name}
                    placeholder={`Set ${setIdx + 1} name (optional)`}
                    aria-label="Set name"
                    onInput={(e) => updateSet(setIdx, (x) => ({...x, name: e.currentTarget.value}))}
                />
                <NumberInput
                    label="Rounds"
                    min={1}
                    precision={0}
                    value={b.rounds}
                    onValueChange={(v) => updateSet(setIdx, (x) => ({...x, rounds: v}))}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label>Set Tags</label>
                <TagInput
                    namespaces={p.namespaces}
                    setNamespaces={p.setNamespaces}
                    thisTags={b.tags}
                    onChange={(t) => updateSet(setIdx, (x) => ({...x, tags: t}))}
                    tagColors={p.tagColors}
                    placeholder="Set tags (optional)"
                    skipTab
                />
            </div>

            {b.steps.length > 0 && (
                <div className="flex flex-col gap-2">
                    {b.steps.map((st, stepIdx) => renderStep(setIdx, stepIdx, st, b.steps.length))}
                </div>
            )}

            <div className="flex flex-col gap-1">
                <label>Add Exercise</label>
                <FuzzySearch<ExerciseWithTags>
                    query={queries[setIdx] ?? ''}
                    onQueryChange={(q) => setQuery(setIdx, q)}
                    data={p.exercises}
                    dataDisplayStr={(e) => e.exercise.name}
                    dataSearchStr={(e) => e.exercise.name}
                    className="w-full"
                    placeholder="Search exercises"
                    noResultsText="No matching exercise"
                    onSelect={(e) => {
                        if (!e) {
                            return;
                        }
                        updateSet(setIdx, (x) => ({...x, steps: [...x.steps, NewWorkoutStep(e.exercise.id)]}));
                        setQuery(setIdx, '');
                    }}
                />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <button disabled={setIdx === 0} aria-label="Move set up" onClick={() => updateSets((bs) => move(bs, setIdx, -1))}>
                    {UpArrow}
                </button>
                <button
                    disabled={setIdx === structure.sets.length - 1}
                    aria-label="Move set down"
                    onClick={() => updateSets((bs) => move(bs, setIdx, 1))}
                >
                    {DownArrow}
                </button>
                <button
                    onClick={() => updateSets((bs) => [...bs.slice(0, setIdx + 1), structuredClone(b), ...bs.slice(setIdx + 1)])}
                >
                    Duplicate Set
                </button>
                <button className="btn-outlined-error" onClick={() => updateSets((bs) => bs.filter((_, j) => j !== setIdx))}>
                    Delete Set
                </button>
            </div>
        </div>
    );

    return (
        <div className={`surface-1 flex flex-col gap-4 ${p.className ?? ''}`}>
            <details className="w-full no-summary-arrow">
                <summary className="cursor-pointer">
                    <h2 className="inline">{p.title}</h2>
                    <small> (click for help)</small>
                </summary>

                <div className="flex flex-col gap-2 pt-2">
                    <p>
                        A workout is a list of sets. A set is a list of steps that repeats for its number of rounds. Each step is
                        one exercise with a kind and a target, like 20 seconds or 10 reps. The same exercise can be timed in one
                        step and counted in reps in another.
                    </p>
                    <h4>Rest</h4>
                    <p>
                        Rest is just an exercise. Use the built-in Rest exercise, or make your own, and add it as a timed step
                        wherever you want a break.
                    </p>
                    <h4>Tags and time tracking</h4>
                    <ul className="list-disc list-inside space-y-1">
                        <li>The workout, each set, and each exercise can have tags.</li>
                        <li>
                            When a timed step finishes, it is recorded as time with all three levels of tags, but only if the
                            exercise itself has a tag.
                        </li>
                        <li>Reps, weighted, and distance steps are never recorded as time.</li>
                    </ul>
                    <p>Chain the tags so they describe the activity. For example:</p>
                    <ul className="list-disc list-inside ml-4">
                        <li>
                            Workout tagged <code>workout:leg_workout_1</code>
                        </li>
                        <li>
                            Set tagged <code>leg_workout_1:cardio</code>
                        </li>
                        <li>
                            Exercise tagged <code>cardio:jumping_jack</code>
                        </li>
                    </ul>
                    <p>
                        Each jumping jack step is recorded as{' '}
                        <code>workout:leg_workout_1 leg_workout_1:cardio cardio:jumping_jack</code>.
                    </p>
                    <h4>Example: a tabata</h4>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Create an exercise, e.g. Jumping Jacks tagged cardio:jumping_jack.</li>
                        <li>Make sure the Rest exercise exists.</li>
                        <li>Name the workout and tag it, e.g. workout:tabata.</li>
                        <li>In the first set, change rounds to 8.</li>
                        <li>Add Jumping Jacks as a timed step of 20 seconds, then Rest as a timed step of 10 seconds.</li>
                        <li>Save. The workout runs 8 x (20s work, 10s rest) = 4 minutes.</li>
                    </ol>
                    <p>The Sample Tabata workout is built exactly like this.</p>
                </div>
            </details>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col gap-2">
                <input
                    className="w-full"
                    type="text"
                    value={name}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="Workout Name (e.g. Leg Day)"
                    aria-label="Workout Name"
                />

                <div className="flex flex-col gap-1">
                    <label>Workout Tags</label>
                    <TagInput
                        namespaces={p.namespaces}
                        setNamespaces={p.setNamespaces}
                        thisTags={tags}
                        onChange={setTags}
                        tagColors={p.tagColors}
                        placeholder="Workout tags (optional)"
                        skipTab
                    />
                </div>

                <label className="flex flex-col gap-1">
                    Note
                    <textarea
                        rows={2}
                        value={note}
                        placeholder="Note (optional)"
                        onInput={(e) => setNote(e.currentTarget.value)}
                    />
                </label>

                <div className="flex flex-col gap-1">
                    <label>Sounds</label>
                    {CUE_OPTIONS.map((o) => (
                        <label key={o.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={structure.cues[o.key]}
                                onChange={(e) => {
                                    const checked = e.currentTarget.checked;
                                    setStructure((s) => ({...s, cues: {...s.cues, [o.key]: checked}}));
                                }}
                            />
                            <span>{o.label}</span>
                        </label>
                    ))}
                </div>

                {structure.sets.map(renderSet)}

                <button className="self-start" onClick={() => updateSets((bs) => [...bs, NewWorkoutSet()])}>
                    Add Set
                </button>

                <small>{StructureSummary(structure)}</small>
            </div>

            <div className="flex justify-end gap-2">
                <button onClick={p.onCancel}>Cancel</button>
                <button className="btn-success" onClick={onSaveClick}>
                    {p.submitLabel}
                </button>
            </div>
        </div>
    );
}
