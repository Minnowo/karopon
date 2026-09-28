import {useState} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';

type AddTagPanelProps = {
    initialNamespace?: string;
    initialName?: string;
    title?: string;
    submitLabel?: string;
    showMergeOption?: boolean;
    onCreate: (namespace: string, name: string, merge: boolean) => void;
    onCancel: () => void;
};

export const AddTagPanel = ({
    initialNamespace = '',
    initialName = '',
    title = 'New Tag',
    submitLabel = 'Create',
    showMergeOption = false,
    onCreate,
    onCancel,
}: AddTagPanelProps) => {
    const [namespace, setNamespace] = useState(initialNamespace);
    const [name, setName] = useState(initialName);
    const [merge, setMerge] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = () => {
        const ns = namespace.trim();
        const nm = name.trim();
        if (!ns || !nm) {
            setLocalError('Namespace and name are required');
            return;
        }
        onCreate(ns, nm, merge);
    };

    return (
        <div className="mb-4 surface-1 flex flex-col gap-2">
            <h2>{title}</h2>
            <ErrorDiv errorMsg={localError} />
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    className="flex-1 px-2 py-1"
                    placeholder="Namespace"
                    aria-label="Namespace"
                    value={namespace}
                    onInput={(e) => {
                        setNamespace(e.currentTarget.value);
                        setLocalError(null);
                    }}
                    autoFocus
                />
                <input
                    type="text"
                    className="flex-1 px-2 py-1"
                    placeholder="Name"
                    aria-label="Name"
                    value={name}
                    onInput={(e) => {
                        setName(e.currentTarget.value);
                        setLocalError(null);
                    }}
                />
            </div>
            {showMergeOption && (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.currentTarget.checked)} />
                    <span className="text-sm">Merge if tag with same name exists</span>
                </label>
            )}
            <div className="flex gap-2 justify-end">
                <button className="btn-error" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn-success" onClick={handleSubmit}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
};
