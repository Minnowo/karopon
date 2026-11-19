import {useId, useState} from 'preact/hooks';
import {EditorDialog} from '../../components/editor_dialog';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';

type AddBodyMetricPanelProps = {
    // Saves the metric; rejects with an ApiError when the server refuses it.
    onCreate: (name: string, unit: string) => Promise<void>;
    onCancel: () => void;
};

export const AddBodyMetricPanel = ({onCreate, onCancel}: AddBodyMetricPanelProps) => {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [nameError, setNameError] = useState<string | undefined>(undefined);
    const [saving, setSaving] = useState<boolean>(false);
    const nameId = `${useId()}-name`;

    const handleSubmit = () => {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setNameError(undefined);
        setSaving(true);

        onCreate(name.trim(), unit.trim())
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                const fieldError = e.fieldErrors().get('#/name');
                setNameError(fieldError);
                setErrorMsg(e);
                if (fieldError !== undefined) {
                    document.getElementById(nameId)?.focus();
                }
            })
            .finally(() => setSaving(false));
    };

    return (
        <EditorDialog title="New Body Metric" saveLabel="Create Metric" saving={saving} onSave={handleSubmit} onClose={onCancel}>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex flex-col gap-1">
                    <input
                        id={nameId}
                        type="text"
                        className="px-2 py-1"
                        placeholder="Name (e.g. Waist)"
                        aria-label="Name"
                        aria-invalid={nameError !== undefined || undefined}
                        aria-describedby={nameError !== undefined ? `${nameId}-error` : undefined}
                        value={name}
                        onInput={(e) => {
                            setName(e.currentTarget.value);
                            setNameError(undefined);
                        }}
                    />
                    <FieldError id={`${nameId}-error`} message={nameError} />
                </div>
                <input
                    type="text"
                    className="sm:w-32 px-2 py-1 self-start"
                    placeholder="Unit (e.g. cm)"
                    aria-label="Unit"
                    value={unit}
                    onInput={(e) => setUnit(e.currentTarget.value)}
                />
            </div>
            <ErrorDiv errorMsg={errorMsg} />
        </EditorDialog>
    );
};
