import {useState} from 'preact/hooks';
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
                    type="text"
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder="View name"
                />
            </label>
            <ErrorDiv errorMsg={error} />
        </EditorDialog>
    );
}
