import {useId, useState} from 'preact/hooks';
import {EditorDialog} from '../../components/editor_dialog';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';

type AddTagPanelProps = {
    initialNamespace?: string;
    initialName?: string;
    title?: string;
    submitLabel?: string;
    showMergeOption?: boolean;
    // Saves the tag; rejects with an ApiError when the server refuses it.
    onCreate: (namespace: string, name: string, merge: boolean) => Promise<void>;
    onCancel: () => void;
};

export const AddTagPanel = ({
    initialNamespace = '',
    initialName = '',
    title = 'New Tag',
    submitLabel = 'Create Tag',
    showMergeOption = false,
    onCreate,
    onCancel,
}: AddTagPanelProps) => {
    const [namespace, setNamespace] = useState(initialNamespace);
    const [name, setName] = useState(initialName);
    const [merge, setMerge] = useState(false);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    // Server field errors keyed by "namespace" or "name"; renames send them as "new_namespace" and "new_name".
    const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState<boolean>(false);
    const baseId = useId();
    const fieldIds = new Map<string, string>([
        ['namespace', `${baseId}-namespace`],
        ['name', `${baseId}-name`],
    ]);

    // Namespace and name only make sense together, so editing either (or the merge choice) clears
    // every message about the tag.
    const clearErrors = () => {
        setFieldErrors(new Map());
        setErrorMsg(null);
    };

    const handleSubmit = () => {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setFieldErrors(new Map());
        setSaving(true);

        onCreate(namespace.trim(), name.trim(), merge)
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                const errs = new Map<string, string>();
                for (const [pointer, detail] of e.fieldErrors()) {
                    errs.set(pointer.replace(/^#\/(new_)?/, ''), detail);
                }
                setFieldErrors(errs);
                setErrorMsg(e);
                for (const [field, id] of fieldIds) {
                    if (errs.has(field)) {
                        document.getElementById(id)?.focus();
                        break;
                    }
                }
            })
            .finally(() => setSaving(false));
    };

    // field renders one input with its server error under it.
    const field = (key: string, label: string, value: string, setValue: (v: string) => void, autoFocus: boolean) => {
        const id = fieldIds.get(key);
        const invalid = fieldErrors.has(key);
        return (
            <div className="flex-1 flex flex-col gap-1">
                <input
                    id={id}
                    type="text"
                    className="px-2 py-1"
                    placeholder={label}
                    aria-label={label}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? `${id}-error` : undefined}
                    value={value}
                    onInput={(e) => {
                        setValue(e.currentTarget.value);
                        clearErrors();
                    }}
                    autoFocus={autoFocus}
                />
                <FieldError id={`${id}-error`} message={fieldErrors.get(key)} />
            </div>
        );
    };

    return (
        <EditorDialog title={title} saveLabel={submitLabel} saving={saving} onSave={handleSubmit} onClose={onCancel}>
            <div className="flex flex-col sm:flex-row gap-2">
                {field('namespace', 'Namespace', namespace, setNamespace, true)}
                {field('name', 'Name', name, setName, false)}
            </div>
            {showMergeOption && (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={merge}
                        onChange={(e) => {
                            setMerge(e.currentTarget.checked);
                            clearErrors();
                        }}
                    />
                    Merge if tag with same name exists
                </label>
            )}
            <ErrorDiv errorMsg={errorMsg} />
        </EditorDialog>
    );
};
