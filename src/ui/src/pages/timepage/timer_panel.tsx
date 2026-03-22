import {TaggedTimespan, TblUserTag, TblUserTimespan, UserTimeFormat} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {TagInput} from '../../components/tag_input';
import {TimeInput} from '../../components/time_input';
import {FormatTimerTimestamp} from '../../utils/date_utils';
import {FormatDuration} from '../../utils/time';
import {TimeNowContext} from './context';

import {Dispatch, StateUpdater, useState} from 'preact/hooks';

type TimerPanelProps = {
    timeformat: UserTimeFormat;
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
    tagColors?: Map<string, string>;
    timer: TaggedTimespan;
    updateTimespan: (timer: TblUserTimespan) => void;
    updateTags: (timer: TaggedTimespan) => void;
    stopTimer: (timer: TaggedTimespan) => void;
    continueTimer: (timer: TaggedTimespan) => void;
    editTimer: (timer: TaggedTimespan) => void;
    deleteTimer: (timer: TaggedTimespan) => void;
};

export const TimerPanel = ({
    timeformat,
    namespaces,
    setNamespaces,
    tagColors,
    timer,
    updateTimespan,
    updateTags,
    continueTimer,
    stopTimer,
    deleteTimer,
}: TimerPanelProps) => {
    const running = timer.timespan.stop_time === 0;
    const [tags, setTags] = useState<TblUserTag[]>([...timer.tags]);
    const [note, setNote] = useState<string | null>(timer.timespan.note);
    const [showNote, setShowNote] = useState<boolean>(timer.timespan.note !== null);

    const [showEdit, setShowEdit] = useState(false);
    const [editStart, setEditStart] = useState<Date>(new Date(timer.timespan.start_time));
    const [editStop, setEditStop] = useState<Date>(new Date(timer.timespan.stop_time || Date.now()));

    const openEdit = () => {
        setEditStart(new Date(timer.timespan.start_time));
        setEditStop(new Date(timer.timespan.stop_time || Date.now()));
        setShowEdit(true);
    };

    const saveNote = () => {
        const n = note ? note.trim() : null;
        updateTimespan({
            ...timer.timespan,
            note: n === '' ? null : n,
        });
        setNote(n === '' ? null : n);
    };

    const saveEdit = () => {
        const n = note ? note.trim() : null;
        updateTimespan({
            ...timer.timespan,
            start_time: editStart.getTime(),
            stop_time: running ? 0 : editStop.getTime(),
            note: n === '' ? null : n,
        });
        setNote(n === '' ? null : n);
        setShowEdit(false);
    };

    return (
        <div className={`flex flex-row items-start sm:items-center container-theme p-2`}>
            <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        tagColors={tagColors}
                        thisTags={tags}
                        onChange={(t: TblUserTag[]) => {
                            setTags(t);
                            updateTags({
                                timespan: {...timer.timespan},
                                tags: t,
                            });
                        }}
                    />

                    <div className="flex flex-row sm:flex-col items-center font-mono justify-evenly">
                        <div className="wsnw">
                            <span>{FormatTimerTimestamp(timer.timespan.start_time)}</span>
                            <span className="text-faded mx-2">{'-'}</span>
                            {running ? (
                                <button className="px-2 py-1 border rounded text-xs" onClick={() => stopTimer(timer)}>
                                    Stop
                                </button>
                            ) : (
                                <span>{FormatTimerTimestamp(timer.timespan.stop_time)}</span>
                            )}
                        </div>
                        <div className="wsnw">
                            {running ? (
                                <TimeNowContext.Consumer>
                                    {(now) => <span className="wsnw">{FormatDuration(now - timer.timespan.start_time)}</span>}
                                </TimeNowContext.Consumer>
                            ) : (
                                <span className="wsnw">
                                    {FormatDuration(timer.timespan.stop_time - timer.timespan.start_time)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {showEdit && (
                    <div className="flex flex-col gap-2">
                        <TimeInput
                            label="Start"
                            value={editStart}
                            onChange={setEditStart}
                            showDate={true}
                            showSeconds={true}
                            hour12={timeformat === UserTimeFormat.Hour12}
                        />
                        {!running && (
                            <TimeInput
                                label="Stop"
                                value={editStop}
                                onChange={setEditStop}
                                showDate={true}
                                showSeconds={true}
                                hour12={timeformat === UserTimeFormat.Hour12}
                            />
                        )}
                        <textarea placeholder="Note" value={note ?? ''} onInput={(e) => setNote(e.currentTarget.value)} />
                        <div className="flex gap-2 justify-end">
                            <button className="cancel-btn" onClick={() => setShowEdit(false)}>
                                Cancel
                            </button>
                            <button className="save-btn" onClick={saveEdit}>
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {!showEdit && showNote && (
                    <textarea placeholder="Note" value={note ?? ''} onInput={(e) => setNote(e.currentTarget.value)} />
                )}
                {!showEdit && showNote && note !== timer.timespan.note && (
                    <div className="flex gap-2 justify-end">
                        <button className="cancel-btn" onClick={() => setNote(timer.timespan.note)}>
                            Cancel
                        </button>
                        <button className="save-btn" onClick={saveNote}>
                            Save
                        </button>
                    </div>
                )}
            </div>
            <DropdownButton
                actions={[
                    {
                        label: 'Continue',
                        onClick: () => continueTimer(timer),
                    },
                    {label: 'Toggle Note', onClick: () => setShowNote((x) => !x)},
                    {label: showEdit ? 'Cancel Edit' : 'Edit', onClick: () => (showEdit ? setShowEdit(false) : openEdit())},
                    {
                        label: 'Delete',
                        dangerous: true,
                        onClick: () => deleteTimer(timer),
                    },
                ]}
            />
        </div>
    );
};
