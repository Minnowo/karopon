import {ApiNewUserExercise, ApiNewUserWorkout} from '../../api/api';
import {ExerciseWithTags, WorkoutWithTags} from '../../api/types';
import {StringifyStructure, WorkoutStructure} from './structure';

export const REST_EXERCISE: ExerciseWithTags = {
    exercise: {id: 0, user_id: 0, name: 'Rest', note: 'Has no tags, so rest is not recorded as time.'},
    tags: [],
};

const JUMPING_JACKS: ExerciseWithTags = {
    exercise: {id: 0, user_id: 0, name: 'Jumping Jacks', note: ''},
    tags: [{namespace: 'cardio', name: 'jumping_jack'}],
};

const findByName = (exercises: ExerciseWithTags[], name: string) =>
    exercises.find((e) => e.exercise.name.toLowerCase() === name.toLowerCase());

export const HasRestExercise = (exercises: ExerciseWithTags[]) =>
    findByName(exercises, REST_EXERCISE.exercise.name) !== undefined;

// Returns the existing exercise with the same name, or creates it.
const ensureExercise = async (exercises: ExerciseWithTags[], preset: ExerciseWithTags): Promise<ExerciseWithTags> =>
    findByName(exercises, preset.exercise.name) ?? (await ApiNewUserExercise(preset));

export const AddRestExercise = (exercises: ExerciseWithTags[]): Promise<ExerciseWithTags> =>
    ensureExercise(exercises, REST_EXERCISE);

// Returns every exercise the sample uses, including ones that already existed.
export const AddSampleWorkout = async (
    exercises: ExerciseWithTags[]
): Promise<{exercises: ExerciseWithTags[]; workout: WorkoutWithTags}> => {
    const rest = await ensureExercise(exercises, REST_EXERCISE);
    const jacks = await ensureExercise(exercises, JUMPING_JACKS);

    const structure: WorkoutStructure = {
        v: 1,
        sets: [
            {
                name: 'Tabata',
                tags: [{namespace: 'sample_tabata', name: 'cardio'}],
                rounds: 8,
                steps: [
                    {exercise_id: jacks.exercise.id, kind: 'timed', seconds: 20, reps: 0, weight: 0, distance: 0, unit: ''},
                    {exercise_id: rest.exercise.id, kind: 'timed', seconds: 10, reps: 0, weight: 0, distance: 0, unit: ''},
                ],
            },
        ],
    };

    const workout = await ApiNewUserWorkout({
        workout: {
            id: 0,
            user_id: 0,
            name: 'Sample Tabata',
            note: '8 rounds of 20s work and 10s rest.',
            structure: StringifyStructure(structure),
        },
        tags: [{namespace: 'workout', name: 'sample_tabata'}],
    });

    return {exercises: [rest, jacks], workout};
};
