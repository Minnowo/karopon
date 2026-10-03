import {useCallback, useEffect, useMemo, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {
    ApiDeleteUserExercise,
    ApiDeleteUserWorkout,
    ApiDeleteUserWorkoutLog,
    ApiGetUserExercises,
    ApiGetUserWorkoutLogs,
    ApiGetUserWorkouts,
    ApiNewUserExercise,
    ApiNewUserWorkout,
    ApiNewUserWorkoutLog,
    ApiUpdateUserExercise,
    ApiUpdateUserWorkout,
    ApiUpdateUserWorkoutLog,
} from '../../api/api';
import {ExerciseWithTags, NewWorkoutLog, UserTimeFormat, WorkoutLogWithSteps, WorkoutWithTags} from '../../api/types';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {GetErrorHandler} from '../../utils/error';
import {FmtTagColor} from '../../utils/tags';
import {AddExercisePanel, ExerciseEditPanel} from './exercise_panel';
import {WorkoutBuilderPanel} from './workout_builder_panel';
import {WorkoutEditPanel} from './workout_list';
import {AddRestExercise, AddSampleWorkout, HasRestExercise} from './presets';
import {ParseStructure} from './structure';
import {RunState, StartRun} from './run_state';
import {Runner} from './runner';
import {Cue} from './cues';
import {WorkoutLogPanel} from './history_panel';
import {LocalClearWorkoutRun, LocalGetWorkoutRun, LocalStoreWorkoutRun} from '../../utils/localstate';
import {UnlockAudioContext} from '../../utils/sound';

type Tab = 'workouts' | 'exercises' | 'history';

const TABS: Array<{value: Tab; label: string}> = [
    {value: 'workouts', label: 'Workouts'},
    {value: 'exercises', label: 'Exercises'},
    {value: 'history', label: 'History'},
];

const sortExercises = (e: ExerciseWithTags[]) => [...e].sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
const sortWorkouts = (w: WorkoutWithTags[]) => [...w].sort((a, b) => a.workout.name.localeCompare(b.workout.name));

export function WorkoutPage(state: BaseState) {
    const [tab, setTab] = useState<Tab>('workouts');
    const [exercises, setExercises] = useState<ExerciseWithTags[]>([]);
    const [workouts, setWorkouts] = useState<WorkoutWithTags[]>([]);
    const [logs, setLogs] = useState<WorkoutLogWithSteps[]>([]);
    const [run, setRunState] = useState<RunState | null>(LocalGetWorkoutRun);
    const [showAddPanel, setShowAddPanel] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleErr = useCallback(GetErrorHandler(setErrorMsg, state.doRefresh), [state.doRefresh]);

    const tagColors = useMemo(
        () => new Map(state.tagColors.map((c) => [c.namespace, FmtTagColor(c.color) ?? c.color])),
        [state.tagColors]
    );

    useEffect(() => {
        Promise.all([ApiGetUserExercises(), ApiGetUserWorkouts(), ApiGetUserWorkoutLogs()])
            .then(([e, w, l]) => {
                setExercises(sortExercises(e));
                setWorkouts(sortWorkouts(w));
                setLogs(l);
            })
            .catch(handleErr);
    }, [handleErr]);

    const addExercise = (e: ExerciseWithTags) => {
        ApiNewUserExercise(e)
            .then((created) => {
                setExercises((xs) => sortExercises([...xs, created]));
                setShowAddPanel(false);
            })
            .catch(handleErr);
    };

    const updateExercise = (e: ExerciseWithTags) => {
        ApiUpdateUserExercise(e)
            .then(() => setExercises((xs) => sortExercises(xs.map((x) => (x.exercise.id === e.exercise.id ? e : x)))))
            .catch(handleErr);
    };

    const deleteExercise = (e: ExerciseWithTags) => {
        const usedIn = workouts.filter((w) =>
            ParseStructure(w.workout.structure).sets.some((b) => b.steps.some((s) => s.exercise_id === e.exercise.id))
        ).length;
        const warning = usedIn > 0 ? ` It is used in ${usedIn} workout(s).` : '';

        if (!confirm(`Delete exercise "${e.exercise.name}"?${warning}`)) {
            return;
        }
        ApiDeleteUserExercise(e.exercise)
            .then(() => setExercises((xs) => xs.filter((x) => x.exercise.id !== e.exercise.id)))
            .catch(handleErr);
    };

    const addWorkout = (w: WorkoutWithTags) => {
        ApiNewUserWorkout(w)
            .then((created) => {
                setWorkouts((ws) => sortWorkouts([...ws, created]));
                setShowAddPanel(false);
            })
            .catch(handleErr);
    };

    const updateWorkout = (w: WorkoutWithTags) => {
        ApiUpdateUserWorkout(w)
            .then(() => setWorkouts((ws) => sortWorkouts(ws.map((x) => (x.workout.id === w.workout.id ? w : x)))))
            .catch(handleErr);
    };

    const deleteWorkout = (w: WorkoutWithTags) => {
        if (!confirm(`Delete workout "${w.workout.name}"?`)) {
            return;
        }
        ApiDeleteUserWorkout(w.workout)
            .then(() => setWorkouts((ws) => ws.filter((x) => x.workout.id !== w.workout.id)))
            .catch(handleErr);
    };

    const mergeExercises = (added: ExerciseWithTags[]) =>
        setExercises((xs) => {
            const ids = new Set(xs.map((x) => x.exercise.id));
            return sortExercises([...xs, ...added.filter((a) => !ids.has(a.exercise.id))]);
        });

    const addRest = () => {
        AddRestExercise(exercises)
            .then((rest) => mergeExercises([rest]))
            .catch(handleErr);
    };

    const addSample = () => {
        AddSampleWorkout(exercises)
            .then((r) => {
                mergeExercises(r.exercises);
                setWorkouts((ws) => sortWorkouts([...ws, r.workout]));
            })
            .catch(handleErr);
    };

    const setRun = (s: RunState) => {
        LocalStoreWorkoutRun(s);
        setRunState(s);
    };

    const endRun = () => {
        LocalClearWorkoutRun();
        setRunState(null);
    };

    const startWorkout = (w: WorkoutWithTags) => {
        const s = StartRun(w, exercises, Date.now());
        if (!s) {
            setErrorMsg('This workout has no steps');
            return;
        }
        UnlockAudioContext();
        // Inside the click, since some browsers only allow audio and speech after a user gesture.
        Cue({type: 'start', step: s.steps[0]}, s.cues);
        setRun(s);
    };

    const saveRun = (log: NewWorkoutLog) => {
        ApiNewUserWorkoutLog(log)
            .then((created) => {
                setLogs((ls) => [created, ...ls]);
                endRun();
                setTab('history');
            })
            .catch(handleErr);
    };

    const updateLog = (log: WorkoutLogWithSteps) => {
        ApiUpdateUserWorkoutLog(log)
            .then((updated) => setLogs((ls) => ls.map((x) => (x.workoutlog.id === updated.workoutlog.id ? updated : x))))
            .catch(handleErr);
    };

    const deleteLog = (log: WorkoutLogWithSteps) => {
        if (!confirm(`Delete this "${log.workoutlog.name}" workout log?`)) {
            return;
        }
        ApiDeleteUserWorkoutLog(log.workoutlog)
            .then(() => setLogs((ls) => ls.filter((x) => x.workoutlog.id !== log.workoutlog.id)))
            .catch(handleErr);
    };

    const tagProps = {namespaces: state.namespaces, setNamespaces: state.setNamespaces, tagColors};

    if (run) {
        return (
            <div className="my-4">
                <ErrorDiv errorMsg={errorMsg} />
                <Runner run={run} setRun={setRun} tagColors={tagColors} onSave={saveRun} onDiscard={endRun} />
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-evenly my-4">
                {TABS.map((t) => (
                    <button
                        key={t.value}
                        className={tab === t.value ? 'font-bold' : ''}
                        aria-pressed={tab === t.value}
                        onClick={() => {
                            setTab(t.value);
                            setShowAddPanel(false);
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {tab === 'workouts' && (
                <>
                    <div className="flex justify-evenly mb-4">
                        <button disabled={showAddPanel} onClick={() => setShowAddPanel(true)}>
                            New Workout
                        </button>
                    </div>

                    {showAddPanel && (
                        <WorkoutBuilderPanel
                            {...tagProps}
                            className="mb-4"
                            exercises={exercises}
                            title="Workout Builder"
                            submitLabel="Create"
                            onSubmit={addWorkout}
                            onCancel={() => setShowAddPanel(false)}
                        />
                    )}

                    <div className="flex flex-col gap-4">
                        {workouts.length === 0 ? (
                            <div className="flex flex-col items-start gap-2">
                                <p>No workouts have been created yet.</p>
                                <button onClick={addSample}>Add Sample Workout</button>
                            </div>
                        ) : (
                            workouts.map((w) => (
                                <WorkoutEditPanel
                                    {...tagProps}
                                    key={w.workout.id}
                                    exercises={exercises}
                                    workout={w}
                                    addWorkout={addWorkout}
                                    updateWorkout={updateWorkout}
                                    deleteWorkout={deleteWorkout}
                                    startWorkout={startWorkout}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {tab === 'exercises' && (
                <>
                    <div className="flex justify-evenly mb-4">
                        <button disabled={showAddPanel} onClick={() => setShowAddPanel(true)}>
                            New Exercise
                        </button>
                        {!HasRestExercise(exercises) && <button onClick={addRest}>Add Rest Exercise</button>}
                    </div>

                    {showAddPanel && (
                        <AddExercisePanel
                            {...tagProps}
                            className="mb-4"
                            title="Create New Exercise"
                            submitLabel="Create"
                            onSubmit={addExercise}
                            onCancel={() => setShowAddPanel(false)}
                        />
                    )}

                    <div className="flex flex-col gap-4">
                        {exercises.length === 0 ? (
                            <p>No exercises have been created yet.</p>
                        ) : (
                            exercises.map((e) => (
                                <ExerciseEditPanel
                                    {...tagProps}
                                    key={e.exercise.id}
                                    exercise={e}
                                    updateExercise={updateExercise}
                                    deleteExercise={deleteExercise}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {tab === 'history' && (
                <div className="flex flex-col gap-4">
                    {logs.length === 0 ? (
                        <p>No workouts have been logged yet.</p>
                    ) : (
                        logs.map((l) => (
                            <WorkoutLogPanel
                                key={l.workoutlog.id}
                                log={l}
                                hour12={state.user.time_format === UserTimeFormat.Hour12}
                                updateLog={updateLog}
                                deleteLog={deleteLog}
                            />
                        ))
                    )}
                </div>
            )}
        </>
    );
}
