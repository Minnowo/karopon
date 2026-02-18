import {TaggedTimespan, TblUserTag, TblUserTimespan} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {TagInput} from '../../components/tag_input';
import {FormatTimerTimestamp} from '../../utils/date_utils';
import {FormatDuration} from '../../utils/time';
import {TimeNowContext} from './context';

import {Dispatch, StateUpdater, useState} from 'preact/hooks';

type TimerPanelProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
    timer: TaggedTimespan;
    updateTimespan: (timer: TblUserTimespan) => void;
    updateTags: (timer: TaggedTimespan) => void;
    stopTimer: (timer: TaggedTimespan) => void;
    continueTimer: (timer: TaggedTimespan) => void;
    editTimer: (timer: TaggedTimespan) => void;
    deleteTimer: (timer: TaggedTimespan) => void;
};

export const TimerPanel = ({
    namespaces,
    setNamespaces,
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

    return (
        <div className={`flex flex-row items-start sm:items-center container-theme p-2`}>
            <div className="w-full flex flex-col">
                <div className="w-full flex flex-col sm:flex-row">
                    <TagInput
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
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
                        <div className="whitespace-nowrap">
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
                        <div className="whitespace-nowrap">
                            {running ? (
                                <TimeNowContext.Consumer>
                                    {(now) => (
                                        <span className="whitespace-nowrap">
                                            {FormatDuration(now - timer.timespan.start_time)}
                                        </span>
                                    )}
                                </TimeNowContext.Consumer>
                            ) : (
                                <span className="whitespace-nowrap">
                                    {FormatDuration(timer.timespan.stop_time - timer.timespan.start_time)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {showNote && (
                    <textarea className="w-full mt-2" value={note ?? ''} onInput={(e) => setNote(e.currentTarget.value)} />
                )}
                {note !== timer.timespan.note && (
                    <div className="w-full flex flex-row gap-2 mt-2 ">
                        <button className="bg-c-red font-bold w-full max-w-32" onClick={() => setNote(timer.timespan.note)}>
                            Cancel
                        </button>
                        <button
                            className="bg-c-green font-bold w-full max-w-32"
                            onClick={() => updateTimespan({...timer.timespan, note})}
                        >
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
                    {label: 'Edit', onClick: () => {}},
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
