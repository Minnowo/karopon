import {Dispatch, StateUpdater, useId, useLayoutEffect, useState} from 'preact/hooks';
import {FormatDateForInput} from '../../utils/date_utils';
import {ChangeEvent} from 'preact/compat';
import {TaggedTimespan, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {TagChip} from '../../components/tag_chip';
import {EditorDialog} from '../../components/editor_dialog';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {ApiError} from '../../api/api';
import {ErrorText, PageErrorMessage} from '../../utils/error';

type Props = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    timer: TaggedTimespan;
    // Saves the timer; rejects with the API error so the dialog can show it.
    onCreate: (timer: TaggedTimespan) => Promise<void>;
    onCancel: () => void;
    showTimeEditing: boolean;
    saveButtonTitle: string;
};

export const AddTimerPanel = ({
    namespaces,
    setNamespaces,
    tagColors,
    timer,
    onCreate,
    onCancel,
    showTimeEditing,
    saveButtonTitle,
}: Props) => {
    const [startTime, setStartTime] = useState<Date>(new Date(timer.timespan.start_time));
    const [stopTime, setStopTime] = useState<Date>(new Date(timer.timespan.stop_time));
    const [note, setNote] = useState<string | null>(timer.timespan.note);
    const [tags, setTags] = useState<TblUserTag[]>([...timer.tags]);

    const tagsId = useId();
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);

    useLayoutEffect(() => {
        setStartTime(new Date(timer.timespan.start_time));
        setStopTime(new Date(timer.timespan.stop_time));
        setNote(timer.timespan.note);
        setTags([...timer.tags]);
    }, [timer]);

    const doCreate = () => {
        const newTimer = {
            timespan: {
                id: 0,
                user_id: 0,
                created: 0,
                start_time: showTimeEditing ? startTime.getTime() : new Date().getTime(),
                stop_time: showTimeEditing ? stopTime.getTime() : 0,
                note,
            },
            tags,
        } as TaggedTimespan;

        if (saving) {
            return;
        }
        setSaving(true);
        setErrorMsg(null);
        onCreate(newTimer)
            // No field to mark for the times here, so field messages show as one alert.
            .catch((e: unknown) => setErrorMsg(e instanceof ApiError ? (PageErrorMessage(e) ?? e) : ErrorText(e)))
            .finally(() => setSaving(false));
    };

    return (
        <EditorDialog title="New Timer" saveLabel={saveButtonTitle} saving={saving} onSave={doCreate} onClose={onCancel}>
            <details className="w-full">
                <summary className="cursor-pointer">How to use timers</summary>

                <div className="flex flex-col gap-2 pt-2">
                    <p>
                        Create a new timer with tags and an optional note. The timer will be started once you hit create, and it
                        will continue until you choose to stop it.
                    </p>

                    <h4>Adding tags</h4>
                    <p>
                        Tags consist of three parts, a namespace, separator, and a value. Using multiple tags, you can describe
                        what the timer is tracking.
                    </p>
                    <p>
                        For example, adding the tags:
                        <span className="w-full flex flex-row flex-wrap gap-2 my-2">
                            {[
                                {namespace: 'project', name: 'karopon'},
                                {namespace: 'work', name: 'development'},
                                {namespace: 'issue', name: '312'},
                            ].map((t) => (
                                <TagChip key={t} tag={t} />
                            ))}
                        </span>
                        Describes what project was being worked on, what type of work was done, and what specific issue was being
                        fixed.
                    </p>

                    <h4>Adding a note</h4>
                    <p>
                        A note is any other text you want to include on a timer, that doesn't fit well using tags. It could be a
                        summary of a conversation, a detailed description of what work was done, etc...
                    </p>
                </div>
            </details>

            {showTimeEditing && (
                <label className="flex flex-col gap-1">
                    Start Time
                    <input
                        type="datetime-local"
                        name="Event Date"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target && setStartTime(new Date(e.currentTarget.value))}
                        value={FormatDateForInput(startTime)}
                    />
                </label>
            )}
            {showTimeEditing && (
                <label className="flex flex-col gap-1">
                    Stop Time
                    <input
                        type="datetime-local"
                        name="Event Date"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target && setStopTime(new Date(e.currentTarget.value))}
                        value={FormatDateForInput(stopTime)}
                    />
                </label>
            )}

            <div className="flex flex-col gap-1">
                <label htmlFor={tagsId}>Tags</label>
                <TagInput
                    id={tagsId}
                    namespaces={namespaces}
                    setNamespaces={setNamespaces}
                    thisTags={tags}
                    onChange={setTags}
                    tagColors={tagColors}
                />
            </div>

            <label className="flex flex-col gap-1">
                Note
                <textarea rows={4} value={note ?? ''} placeholder={'Note'} onInput={(e) => setNote(e.currentTarget.value)} />
            </label>

            <ErrorDiv errorMsg={errorMsg} />
        </EditorDialog>
    );
};
