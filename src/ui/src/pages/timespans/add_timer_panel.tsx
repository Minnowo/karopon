import {Dispatch, StateUpdater, useLayoutEffect, useState} from 'preact/hooks';
import {FormatDateForInput} from '../../utils/date_utils';
import {ChangeEvent} from 'preact/compat';
import {TaggedTimespan, TblUserTag} from '../../api/types';
import {TagInput} from '../../components/tag_input';
import {TagChip} from '../../components/tag_chip';

type Props = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
    timer: TaggedTimespan;
    createTimer: (timer: TaggedTimespan) => void;
    showTimeEditing: boolean;
    saveButtonTitle: string;
};

export const AddTimerPanel = (p: Props) => {
    const [startTime, setStartTime] = useState<Date>(new Date(p.timer.timespan.start_time));
    const [stopTime, setStopTime] = useState<Date>(new Date(p.timer.timespan.stop_time));
    const [note, setNote] = useState<string | null>(p.timer.timespan.note);
    const [tags, setTags] = useState<TblUserTag[]>([...p.timer.tags]);

    useLayoutEffect(() => {
        setStartTime(new Date(p.timer.timespan.start_time));
        setStopTime(new Date(p.timer.timespan.stop_time));
        setNote(p.timer.timespan.note);
        setTags([...p.timer.tags]);
    }, [p.timer]);

    const onCreate = () => {
        const timer = {
            timespan: {
                id: 0,
                user_id: 0,
                created: 0,
                start_time: p.showTimeEditing ? startTime.getTime() : new Date().getTime(),
                stop_time: p.showTimeEditing ? stopTime.getTime() : 0,
                note,
            },
            tags,
        } as TaggedTimespan;

        p.createTimer(timer);
    };

    return (
        <div className={`rounded-sm p-2 border container-theme`}>
            <details className="w-full no-summary-arrow">
                <summary className="cursor-pointer text-lg font-bold">
                    Create New Timer
                    <span className="text-xs"> (click for help)</span>
                </summary>

                <div className="text-sm p-4">
                    <p>
                        Create a new timer with tags and an optional note. The timer will be started once you hit create, and it
                        will continue until you choose to stop it.
                    </p>

                    <br />

                    <p className="font-semibold">Adding tags</p>
                    <p>
                        Tags consist of three parts, a namespace, separator, and a value. Using multiple tags, you can describe
                        what the timer is tracking.
                        <br />
                        <br />
                        For example, adding the tags:
                        <span className="w-full flex flex-row gap-3 my-2">
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

                    <br />

                    <p className="font-semibold">Adding a note</p>
                    <p>
                        A note is any other text you want to include on a timer, that doesn't fit well using tags. It could be a
                        summary of a conversation, a detailed description of what work was done, etc...
                    </p>
                </div>
            </details>

            {p.showTimeEditing && (
                <div className="mt-1">
                    <span className="font-semibold">Start Time</span>
                    <input
                        class="w-full my-1 sm:mx-1"
                        type="datetime-local"
                        name="Event Date"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target && setStartTime(new Date(e.currentTarget.value))}
                        value={FormatDateForInput(startTime)}
                    />
                </div>
            )}
            {p.showTimeEditing && (
                <div className="mt-1">
                    <span className="font-semibold">Stop Time</span>
                    <input
                        class="w-full my-1 sm:mx-1"
                        type="datetime-local"
                        name="Event Date"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target && setStopTime(new Date(e.currentTarget.value))}
                        value={FormatDateForInput(stopTime)}
                    />
                </div>
            )}

            <div className="mt-1">
                <span className="font-semibold">Tags</span>
                <div className="container-theme">
                    <TagInput namespaces={p.namespaces} setNamespaces={p.setNamespaces} thisTags={tags} onChange={setTags} />
                </div>
            </div>

            <div className="mt-1">
                <span className="font-semibold">Note</span>
                <textarea
                    className="w-full border rounded px-2 py-1"
                    rows={4}
                    value={note ?? ''}
                    onInput={(e) => setNote(e.currentTarget.value)}
                />
            </div>

            <div className="w-full flex justify-end">
                <input
                    className="w-full my-1 sm:ml-1 sm:max-w-32 bg-c-green font-bold"
                    type="submit"
                    value={p.saveButtonTitle}
                    onClick={onCreate}
                />
            </div>
        </div>
    );
};
