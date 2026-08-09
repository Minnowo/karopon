import {Dispatch, StateUpdater, useState} from 'preact/hooks';
import {NewUserActivityRequest, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';

type AddActivityPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    title?: string;
    submitLabel?: string;
    initial?: NewUserActivityRequest;
    onCreate: (req: NewUserActivityRequest) => void;
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
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onSaveClick = () => {
        const trimmedName = name.trim();

        if (trimmedName === '') {
            setErrorMsg('Activity cannot have an empty name');
            return;
        }

        if (tag === null) {
            setErrorMsg('Activity must have a tag');
            return;
        }

        if (duration <= 0) {
            setErrorMsg('Duration must be a positive number');
            return;
        }

        onCreate({
            name: trimmedName,
            tag_namespace: tag.namespace,
            tag_name: tag.name,
            duration,
            note,
        });
    };

    return (
        <div className={`rounded-sm p-2 border container-theme ${className}`}>
            <div className="w-full mb-2 text-lg font-bold">{title}</div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col font-semibold gap-2">
                <input
                    className="w-full"
                    type="text"
                    value={name}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="Activity Name (e.g. Calf raises)"
                    aria-label="Activity Name"
                />

                <div>
                    <span className="font-semibold">Tag</span>
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        thisTags={tag ? [tag] : []}
                        onChange={(tags) => setTag(tags.length > 0 ? tags[tags.length - 1] : null)}
                        tagColors={tagColors}
                        placeholder="Tag"
                    />
                </div>

                <NumberInput
                    className="w-full"
                    innerClassName="w-full"
                    label={'Duration (min)'}
                    min={1}
                    value={duration}
                    onValueChange={setDuration}
                />

                <label className="block">
                    <span className="font-semibold">Note</span>
                    <textarea
                        className="w-full"
                        rows={2}
                        value={note}
                        placeholder="Note (optional)"
                        onInput={(e) => setNote(e.currentTarget.value)}
                    />
                </label>
            </div>

            <div className="flex justify-end gap-2 mt-2">
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="save-btn" onClick={onSaveClick}>
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}
