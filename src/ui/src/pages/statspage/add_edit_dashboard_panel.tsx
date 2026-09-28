import {useState} from 'preact/hooks';

type DashboardSettingsPanelProps = {
    className?: string;
    titleLabel: string;
    initialName: string;
    confirmLabel: string;
    saving?: boolean;
    onConfirm: (name: string) => void;
    onCancel: () => void;
};
export function AddEditDashboardPanel({
    className = 'mt-4 mb-4',
    titleLabel,
    initialName,
    confirmLabel,
    saving = false,
    onConfirm,
    onCancel,
}: DashboardSettingsPanelProps) {
    const [name, setName] = useState(initialName);

    return (
        <div className={`flex flex-col gap-2 surface-1 ${className}`}>
            <h2 className="mb-0">{titleLabel}</h2>
            <input
                type="text"
                className="w-full px-2 py-1"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="View name"
                aria-label="View name"
                autoFocus
            />

            <div className="flex justify-end gap-2">
                <button className="btn-error" onClick={onCancel} disabled={saving}>
                    Cancel
                </button>
                <button className="btn-success" onClick={() => onConfirm(name)} disabled={saving}>
                    {saving ? 'Saving...' : confirmLabel}
                </button>
            </div>
        </div>
    );
}
