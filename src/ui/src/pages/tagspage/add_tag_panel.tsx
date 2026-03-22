import {useState} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';

type AddTagPanelProps = {
    initialNamespace?: string;
    initialName?: string;
    title?: string;
    submitLabel?: string;
    onCreate: (namespace: string, name: string) => void;
    onCancel: () => void;
};

export const AddTagPanel = ({
    initialNamespace = '',
    initialName = '',
    title = 'New Tag',
    submitLabel = 'Create',
    onCreate,
    onCancel,
}: AddTagPanelProps) => {
    const [namespace, setNamespace] = useState(initialNamespace);
    const [name, setName] = useState(initialName);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = () => {
        const ns = namespace.trim();
        const nm = name.trim();
        if (!ns || !nm) {
            setLocalError('Namespace and name are required');
            return;
        }
        onCreate(ns, nm);
    };

    return (
        <div className="mb-4 p-3 border rounded container-theme flex flex-col gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            <ErrorDiv errorMsg={localError} />
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    className="flex-1 px-2 py-1"
                    placeholder="Namespace"
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
                    value={name}
                    onInput={(e) => {
                        setName(e.currentTarget.value);
                        setLocalError(null);
                    }}
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="save-btn" onClick={handleSubmit}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
};
