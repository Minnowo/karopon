import {Dispatch, StateUpdater, useMemo, useState} from 'preact/hooks';
import {ExerciseWithTags, WorkoutWithTags} from '../../api/types';
import {TagChip} from '../../components/tag_chip';
import {DropdownButton} from '../../components/drop_down_button';
import {ParseStructure} from './structure';
import {StructureSummary, WorkoutBuilderPanel} from './workout_builder_panel';

type WorkoutEditPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors: Map<string, string>;
    exercises: ExerciseWithTags[];
    workout: WorkoutWithTags;
    updateWorkout: (w: WorkoutWithTags) => void;
    deleteWorkout: (w: WorkoutWithTags) => void;
    startWorkout: (w: WorkoutWithTags) => void;
};

export function WorkoutEditPanel(p: WorkoutEditPanelProps) {
    const [showEdit, setShowEdit] = useState(false);

    const summary = useMemo(() => StructureSummary(ParseStructure(p.workout.workout.structure)), [p.workout.workout.structure]);

    if (showEdit) {
        return (
            <WorkoutBuilderPanel
                namespaces={p.namespaces}
                setNamespaces={p.setNamespaces}
                tagColors={p.tagColors}
                exercises={p.exercises}
                title="Edit Workout"
                submitLabel="Save"
                initial={p.workout}
                onSubmit={(w) => {
                    p.updateWorkout(w);
                    setShowEdit(false);
                }}
                onCancel={() => setShowEdit(false)}
            />
        );
    }

    const {workout, tags} = p.workout;

    return (
        <div className="w-full surface-1 flex items-center gap-2">
            <div className="flex-1 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2>{workout.name}</h2>
                    {tags.map((t) => (
                        <TagChip key={`${t.namespace}:${t.name}`} tag={t} color={p.tagColors.get(t.namespace)} />
                    ))}
                </div>
                <small>
                    {summary}
                    {workout.note ? ` - ${workout.note}` : ''}
                </small>
            </div>
            <button className="btn-success" onClick={() => p.startWorkout(p.workout)}>
                Start
            </button>
            <DropdownButton
                actions={[
                    {label: 'Edit', onClick: () => setShowEdit(true)},
                    {label: 'Delete', dangerous: true, onClick: () => p.deleteWorkout(p.workout)},
                ]}
            />
        </div>
    );
}
