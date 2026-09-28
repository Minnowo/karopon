import {Dispatch, StateUpdater, useState} from 'preact/hooks';
import {ExerciseWithTags, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {TagChip} from '../../components/tag_chip';
import {ErrorDiv} from '../../components/error_div';
import {DropdownButton} from '../../components/drop_down_button';

type TagProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors: Map<string, string>;
};

type AddExercisePanelProps = TagProps & {
    title: string;
    submitLabel: string;
    initial?: ExerciseWithTags;
    onSubmit: (e: ExerciseWithTags) => void;
    onCancel: () => void;
    className?: string;
};

export function AddExercisePanel({
    namespaces,
    setNamespaces,
    tagColors,
    title,
    submitLabel,
    initial,
    onSubmit,
    onCancel,
    className = '',
}: AddExercisePanelProps) {
    const [name, setName] = useState<string>(initial?.exercise.name ?? '');
    const [tags, setTags] = useState<TblUserTag[]>(initial?.tags ?? []);
    const [note, setNote] = useState<string>(initial?.exercise.note ?? '');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onSaveClick = () => {
        const trimmedName = name.trim();

        if (trimmedName === '') {
            setErrorMsg('Exercise cannot have an empty name');
            return;
        }

        onSubmit({
            exercise: {id: initial?.exercise.id ?? 0, user_id: 0, name: trimmedName, note},
            tags,
        });
    };

    return (
        <div className={`rounded-sm p-2 border surface-1 ${className}`}>
            <h2 className="mb-4">{title}</h2>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col gap-2">
                <input
                    className="w-full"
                    type="text"
                    value={name}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="Exercise Name (e.g. Squats)"
                    aria-label="Exercise Name"
                />

                <div>
                    <span className="font-semibold">Tags</span>
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        thisTags={tags}
                        onChange={setTags}
                        tagColors={tagColors}
                        placeholder="Tags (optional)"
                    />
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
            </div>

            <div className="flex justify-end gap-2 mt-2">
                <button className="btn-error" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn-success" onClick={onSaveClick}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}

type ExerciseEditPanelProps = TagProps & {
    exercise: ExerciseWithTags;
    updateExercise: (e: ExerciseWithTags) => void;
    deleteExercise: (e: ExerciseWithTags) => void;
};

export function ExerciseEditPanel({
    namespaces,
    setNamespaces,
    tagColors,
    exercise,
    updateExercise,
    deleteExercise,
}: ExerciseEditPanelProps) {
    const [showEdit, setShowEdit] = useState(false);

    if (showEdit) {
        return (
            <AddExercisePanel
                namespaces={namespaces}
                setNamespaces={setNamespaces}
                tagColors={tagColors}
                title="Edit Exercise"
                submitLabel="Save"
                initial={exercise}
                onSubmit={(e) => {
                    updateExercise(e);
                    setShowEdit(false);
                }}
                onCancel={() => setShowEdit(false)}
            />
        );
    }

    return (
        <div className="w-full surface-1 flex items-center gap-2">
            <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="mb-0">{exercise.exercise.name}</h2>
                    {exercise.tags.map((t) => (
                        <TagChip key={`${t.namespace}:${t.name}`} tag={t} color={tagColors.get(t.namespace)} />
                    ))}
                </div>
                {exercise.exercise.note && <div className="text-sm text-c-on-surface-variant">{exercise.exercise.note}</div>}
            </div>
            <DropdownButton
                actions={[
                    {label: 'Edit', onClick: () => setShowEdit(true)},
                    {label: 'Delete', dangerous: true, onClick: () => deleteExercise(exercise)},
                ]}
            />
        </div>
    );
}
