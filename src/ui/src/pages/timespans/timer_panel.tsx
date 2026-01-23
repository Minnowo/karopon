import {TaggedTimespan, TblUserTag} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {TagInput} from '../../components/tag_input';
import {FormatTimerTimestamp} from '../../utils/date_utils';
import {FormatDuration} from '../../utils/time';
import {TimeNowContext} from './context';

import {useState} from 'preact/hooks';

type TimerPanelProps = {
    namespaces: string[];
    timer: TaggedTimespan;
    updateTags: (timer: TaggedTimespan) => void;
    stopTimer: (timer: TaggedTimespan) => void;
    continueTimer: (timer: TaggedTimespan) => void;
    editTimer: (timer: TaggedTimespan) => void;
    deleteTimer: (timer: TaggedTimespan) => void;
};

export const TimerPanel = ({namespaces, timer, updateTags, continueTimer, stopTimer, deleteTimer}: TimerPanelProps) => {
    const running = timer.timespan.stop_time === 0;
    const [tags, setTags] = useState<TblUserTag[]>([...timer.tags]);

    return (
        <div className="flex flex-row items-start sm:items-center container-theme p-2">
            <div className="w-full flex flex-col sm:flex-row">
                <TagInput
                    namespaces={namespaces}
                    thisTags={tags}
                    onChange={(t: TblUserTag[]) => {
                        console.info(t);
                        setTags(t);

                        const cpy = {...timer};
                        cpy.tags = t;

                        updateTags(cpy);
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
                                    <span className="whitespace-nowrap">{FormatDuration(now - timer.timespan.start_time)}</span>
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
            <DropdownButton
                actions={[
                    {
                        label: 'Continue',
                        onClick: () => continueTimer(timer),
                    },
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
