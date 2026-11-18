import {Dispatch, StateUpdater, useId, useState} from 'preact/hooks';
import {ExerciseWithTags, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {TagChip} from '../../components/tag_chip';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';
import {DropdownButton} from '../../components/drop_down_button';
import {ExerciseText} from './structure';

type TagProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors: Map<string, string>;
};

type AddExercisePanelProps = TagProps & {
    title: string;
    submitLabel: string;
    initial?: ExerciseWithTags;
    // Saves; rejects with an ApiError when the server refuses it.
    onSubmit: (e: ExerciseWithTags) => Promise<void>;
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
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [nameError, setNameError] = useState<string | undefined>(undefined);
    const [saving, setSaving] = useState<boolean>(false);
    const nameId = `${useId()}-name`;

    const onSaveClick = () => {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setNameError(undefined);
        setSaving(true);
        const trimmedName = name.trim();

        onSubmit({
            exercise: {id: initial?.exercise.id ?? 0, user_id: 0, name: trimmedName, note},
            tags,
        })
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                const fieldError = e.fieldErrors().get('#/exercise/name');
                setNameError(fieldError);
                setErrorMsg(e);
                if (fieldError !== undefined) {
                    document.getElementById(nameId)?.focus();
                }
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className={`surface-1 flex flex-col gap-4 ${className}`}>
            <h2>{title}</h2>

            <div className="flex flex-col gap-2">
                <input
                    className="w-full"
                    type="text"
                    id={nameId}
                    value={name}
                    onInput={(e) => {
                        setName(e.currentTarget.value);
                        setNameError(undefined);
                    }}
                    placeholder="Exercise Name (e.g. Squats)"
                    aria-label="Exercise Name"
                    aria-invalid={nameError !== undefined || undefined}
                    aria-describedby={nameError !== undefined ? `${nameId}-error` : undefined}
                />
                <FieldError id={`${nameId}-error`} message={nameError} />

                <div className="flex flex-col gap-1">
                    <label>Tags</label>
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        thisTags={tags}
                        onChange={setTags}
                        tagColors={tagColors}
                        placeholder="Tags (optional)"
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
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex justify-end gap-2">
                <button onClick={onCancel}>Cancel</button>
                <button className="btn-success" aria-disabled={saving || undefined} onClick={onSaveClick}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}

type ExerciseEditPanelProps = TagProps & {
    exercise: ExerciseWithTags;
    updateExercise: (e: ExerciseWithTags) => Promise<void>;
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
                onSubmit={(e) => updateExercise(e).then(() => setShowEdit(false))}
                onCancel={() => setShowEdit(false)}
            />
        );
    }

    return (
        <div className="w-full surface-1 flex items-center gap-2">
            <div className="flex-1 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2>{exercise.exercise.name}</h2>
                    {exercise.tags.map((t) => (
                        <TagChip key={`${t.namespace}:${t.name}`} tag={t} color={tagColors.get(t.namespace)} />
                    ))}
                </div>
                {exercise.exercise.note && <small>{exercise.exercise.note}</small>}
            </div>
            <DropdownButton
                actions={[
                    {label: 'Edit', onClick: () => setShowEdit(true)},
                    {label: 'Copy as Text', onClick: () => void navigator.clipboard.writeText(ExerciseText(exercise))},
                    {label: 'Delete', dangerous: true, onClick: () => deleteExercise(exercise)},
                ]}
            />
        </div>
    );
}
