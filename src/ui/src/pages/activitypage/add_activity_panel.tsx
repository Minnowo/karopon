import {Dispatch, StateUpdater, useId, useState} from 'preact/hooks';
import {NewUserActivityRequest, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';

type AddActivityPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    title?: string;
    submitLabel?: string;
    initial?: NewUserActivityRequest;
    // Saves the activity; rejects with an ApiError when the server refuses it.
    onCreate: (req: NewUserActivityRequest) => Promise<void>;
    onCancel: () => void;
    className?: string;
};

export function AddActivityPanel({
    namespaces,
    setNamespaces,
    tagColors,
    title = 'Create New Break Activity',
    submitLabel = 'Create',
    initial,
    onCreate,
    onCancel,
    className = '',
}: AddActivityPanelProps) {
    const [name, setName] = useState<string>(initial?.name ?? '');
    const [tag, setTag] = useState<TblUserTag | null>(
        initial && initial.tag_namespace ? {namespace: initial.tag_namespace, name: initial.tag_name} : null
    );
    const [duration, setDuration] = useState<number>(initial?.duration ?? 1);
    const [note, setNote] = useState<string>(initial?.note ?? '');
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState<boolean>(false);
    const baseId = useId();
    const fieldIds = new Map<string, string>([
        ['#/name', `${baseId}-name`],
        ['#/tag_name', `${baseId}-tag`],
        ['#/duration', `${baseId}-duration`],
    ]);

    const clearFieldError = (pointer: string) => {
        setFieldErrors((prev) => {
            if (!prev.has(pointer)) {
                return prev;
            }
            const next = new Map(prev);
            next.delete(pointer);
            return next;
        });
    };

    // invalidProps returns the aria attributes for the field at pointer.
    const invalidProps = (pointer: string) => ({
        id: fieldIds.get(pointer),
        'aria-invalid': fieldErrors.has(pointer) || undefined,
        'aria-describedby': fieldErrors.has(pointer) ? `${fieldIds.get(pointer)}-error` : undefined,
    });

    const onSaveClick = () => {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setFieldErrors(new Map());
        setSaving(true);

        onCreate({
            name: name.trim(),
            tag_namespace: tag?.namespace ?? '',
            tag_name: tag?.name ?? '',
            duration,
            note,
        })
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                const errs = e.fieldErrors();
                setFieldErrors(errs);
                setErrorMsg(e);
                for (const [pointer, id] of fieldIds) {
                    if (errs.has(pointer)) {
                        document.getElementById(id)?.focus();
                        break;
                    }
                }
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className={`surface-1 flex flex-col gap-4 ${className}`}>
            <h2>{title}</h2>

            <div className="flex flex-col gap-2">
                <input
                    {...invalidProps('#/name')}
                    className="w-full"
                    type="text"
                    value={name}
                    onInput={(e) => {
                        setName(e.currentTarget.value);
                        clearFieldError('#/name');
                    }}
                    placeholder="Activity Name (e.g. Calf raises)"
                    aria-label="Activity Name"
                />
                <FieldError id={`${baseId}-name-error`} message={fieldErrors.get('#/name')} />

                <div className="flex flex-col gap-1">
                    <label>Tag</label>
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        thisTags={tag ? [tag] : []}
                        onChange={(tags) => {
                            setTag(tags.length > 0 ? tags[tags.length - 1] : null);
                            clearFieldError('#/tag_name');
                        }}
                        tagColors={tagColors}
                        placeholder="Tag"
                        id={fieldIds.get('#/tag_name')}
                        invalid={fieldErrors.has('#/tag_name')}
                        errorId={`${baseId}-tag-error`}
                    />
                    <FieldError id={`${baseId}-tag-error`} message={fieldErrors.get('#/tag_name')} />
                </div>

                <NumberInput
                    className="w-full"
                    innerClassName="w-full"
                    label={'Duration (min)'}
                    min={1}
                    value={duration}
                    id={fieldIds.get('#/duration')}
                    invalid={fieldErrors.has('#/duration')}
                    errorId={`${baseId}-duration-error`}
                    onValueChange={(v) => {
                        setDuration(v);
                        clearFieldError('#/duration');
                    }}
                />
                <FieldError id={`${baseId}-duration-error`} message={fieldErrors.get('#/duration')} />

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
