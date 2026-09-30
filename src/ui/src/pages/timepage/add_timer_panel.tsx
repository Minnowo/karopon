import {Dispatch, StateUpdater, useId, useLayoutEffect, useState} from 'preact/hooks';
import {FormatDateForInput} from '../../utils/date_utils';
import {ChangeEvent} from 'preact/compat';
import {TaggedTimespan, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {TagChip} from '../../components/tag_chip';

type Props = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    timer: TaggedTimespan;
    onCreate: (timer: TaggedTimespan) => void;
    onCancel: () => void;
    showTimeEditing: boolean;
    saveButtonTitle: string;
    className?: string;
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
    className = '',
}: Props) => {
    const [startTime, setStartTime] = useState<Date>(new Date(timer.timespan.start_time));
    const [stopTime, setStopTime] = useState<Date>(new Date(timer.timespan.stop_time));
    const [note, setNote] = useState<string | null>(timer.timespan.note);
    const [tags, setTags] = useState<TblUserTag[]>([...timer.tags]);

    const tagsId = useId();

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

        onCreate(newTimer);
    };

    return (
        <div className={`flex flex-col gap-4 surface-1 ${className}`}>
            <details className="w-full no-summary-arrow">
                <summary className="cursor-pointer">
                    <h2 className="inline">Create New Timer</h2>
                    <small> (click for help)</small>
                </summary>

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

            <div className="flex justify-end gap-2">
                <button onClick={onCancel}>Cancel</button>
                <button className="btn-success" onClick={doCreate}>
                    {saveButtonTitle}
                </button>
            </div>
        </div>
    );
};
