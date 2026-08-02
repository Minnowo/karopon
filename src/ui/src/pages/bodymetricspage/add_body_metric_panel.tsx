import {useState} from 'preact/hooks';
import {ErrorDiv} from '../../components/error_div';

type AddBodyMetricPanelProps = {
    onCreate: (name: string, unit: string) => void;
    onCancel: () => void;
};

export const AddBodyMetricPanel = ({onCreate, onCancel}: AddBodyMetricPanelProps) => {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = () => {
        const nm = name.trim();
        const u = unit.trim();
        if (!nm) {
            setLocalError('Name is required');
            return;
        }
        onCreate(nm, u);
    };

    return (
        <div className="mb-4 p-3 border rounded container-theme flex flex-col gap-2">
            <h2 className="text-lg font-bold">New Body Metric</h2>
            <ErrorDiv errorMsg={localError} />
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    className="flex-1 px-2 py-1"
                    placeholder="Name (e.g. Waist)"
                    aria-label="Name"
                    value={name}
                    onInput={(e) => {
                        setName(e.currentTarget.value);
                        setLocalError(null);
                    }}
                    autoFocus
                />
                <input
                    type="text"
                    className="sm:w-32 px-2 py-1"
                    placeholder="Unit (e.g. cm)"
                    aria-label="Unit"
                    value={unit}
                    onInput={(e) => {
                        setUnit(e.currentTarget.value);
                        setLocalError(null);
                    }}
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="save-btn" onClick={handleSubmit}>
                    Create
                </button>
            </div>
        </div>
    );
};
