import {TaggedTimespan, TblUserTag, TblUserTimespan, UserTimeFormat} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {TagInput} from '../../components/tag_input';
import {TimeInput} from '../../components/time_input';
import {FormatTimerTimestamp} from '../../utils/date_utils';
import {FormatDuration} from '../../utils/time';
import {useTimeNow} from '../../hooks/useTimeNow';
import {EditorDialog} from '../../components/editor_dialog';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {ApiError} from '../../api/api';
import {ErrorText, PageErrorMessage} from '../../utils/error';

import {Dispatch, StateUpdater, useState} from 'preact/hooks';

const RunningDuration = ({startTime}: {startTime: number}) => {
    const now = useTimeNow();
    return <span className="wsnw">{FormatDuration(now - startTime)}</span>;
};

type TimerPanelProps = {
    timeformat: UserTimeFormat;
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    timer: TaggedTimespan;
    updateTimespan: (timer: TblUserTimespan) => void;
    updateTags: (timer: TaggedTimespan) => void;
    stopTimer: (timer: TaggedTimespan) => void;
    continueTimer: (timer: TaggedTimespan) => void;
    // Saves an edit; rejects with the API error so the edit dialog can show it.
    saveTimespan: (timer: TblUserTimespan) => Promise<void>;
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
    saveTimespan,
}: TimerPanelProps) => {
    const running = timer.timespan.stop_time === 0;
    const [tags, setTags] = useState<TblUserTag[]>([...timer.tags]);
    const [note, setNote] = useState<string | null>(timer.timespan.note);
    const [showNote, setShowNote] = useState<boolean>(timer.timespan.note !== null);

    const [showEdit, setShowEdit] = useState(false);
    const [editNote, setEditNote] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [editError, setEditError] = useState<ErrorDivMsg | null>(null);
    const [editStart, setEditStart] = useState<Date>(new Date(timer.timespan.start_time));
    const [editStop, setEditStop] = useState<Date>(new Date(timer.timespan.stop_time || Date.now()));

    const openEdit = () => {
        setEditStart(new Date(timer.timespan.start_time));
        setEditStop(new Date(timer.timespan.stop_time || Date.now()));
        setEditNote(timer.timespan.note ?? '');
        setEditError(null);
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
        if (saving) {
            return;
        }
        const n = editNote.trim() === '' ? null : editNote.trim();
        setSaving(true);
        setEditError(null);
        saveTimespan({
            ...timer.timespan,
            start_time: editStart.getTime(),
            stop_time: running ? 0 : editStop.getTime(),
            note: n,
        })
            .then(() => {
                setNote(n);
                setShowEdit(false);
            })
            // The times have no field of their own to mark, so field messages show as one alert.
            .catch((e: unknown) => setEditError(e instanceof ApiError ? (PageErrorMessage(e) ?? e) : ErrorText(e)))
            .finally(() => setSaving(false));
    };

    return (
        <div className="flex flex-row items-start sm:items-center surface-1">
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
                                <button onClick={() => stopTimer(timer)}>Stop</button>
                            ) : (
                                <span>{FormatTimerTimestamp(timer.timespan.stop_time)}</span>
                            )}
                        </div>
                        <div className="wsnw">
                            {running ? (
                                <RunningDuration startTime={timer.timespan.start_time} />
                            ) : (
                                <span className="wsnw">
                                    {FormatDuration(timer.timespan.stop_time - timer.timespan.start_time)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!showEdit && showNote && (
                    <textarea
                        placeholder="Note"
                        aria-label="Note"
                        value={note ?? ''}
                        onInput={(e) => setNote(e.currentTarget.value)}
                    />
                )}
                {!showEdit && showNote && note !== timer.timespan.note && (
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setNote(timer.timespan.note)}>Cancel</button>
                        <button className="btn-success" onClick={saveNote}>
                            Save
                        </button>
                    </div>
                )}
            </div>
            {showEdit && (
                <EditorDialog
                    title="Edit Timer"
                    saveLabel="Save"
                    saving={saving}
                    onSave={saveEdit}
                    onClose={() => setShowEdit(false)}
                >
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
                    <label className="flex flex-col gap-1">
                        Note
                        <textarea rows={4} value={editNote} onInput={(e) => setEditNote(e.currentTarget.value)} />
                    </label>
                    <ErrorDiv errorMsg={editError} />
                </EditorDialog>
            )}
            <DropdownButton
                actions={[
                    {
                        label: 'Continue',
                        onClick: () => continueTimer(timer),
                    },
                    {label: 'Toggle Note', onClick: () => setShowNote((x) => !x)},
                    {label: 'Edit', onClick: openEdit},
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
