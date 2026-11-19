import {useEffect, useId, useRef, useState} from 'preact/hooks';
import {ApiError} from '../../api/api';
import {FieldError} from '../../components/field_error';
import {EditorDialog} from '../../components/editor_dialog';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';

type DashboardSettingsPanelProps = {
    titleLabel: string;
    initialName: string;
    confirmLabel: string;
    saving?: boolean;
    // The save's error, shown in the dialog; the caller keeps it.
    error?: ErrorDivMsg | null;
    onConfirm: (name: string) => void;
    onCancel: () => void;
};

// AddEditDashboardPanel asks for a view's name, for a new view or a rename.
export function AddEditDashboardPanel({
    titleLabel,
    initialName,
    confirmLabel,
    saving = false,
    error = null,
    onConfirm,
    onCancel,
}: DashboardSettingsPanelProps) {
    const [name, setName] = useState(initialName);
    const nameErrorId = `${useId()}-name-error`;
    // The server checks the name; its message goes on the field.
    const nameError = error instanceof ApiError ? error.fieldErrors().get('#/name') : undefined;
    const nameRef = useRef<HTMLInputElement>(null);

    // A rejected name takes focus, like the other forms.
    useEffect(() => {
        if (nameError !== undefined) {
            nameRef.current?.focus();
        }
    }, [error, nameError]);

    return (
        <EditorDialog
            title={titleLabel}
            saveLabel={confirmLabel}
            saving={saving}
            onSave={() => onConfirm(name)}
            onClose={onCancel}
        >
            <label className="flex flex-col gap-1">
                Name
                <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder="View name"
                    aria-invalid={nameError !== undefined || undefined}
                    aria-describedby={nameError !== undefined ? nameErrorId : undefined}
                />
            </label>
            <FieldError id={nameErrorId} message={nameError} />
            <ErrorDiv errorMsg={error} />
        </EditorDialog>
    );
}
