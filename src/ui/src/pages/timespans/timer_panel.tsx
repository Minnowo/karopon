import {TblUserTimespan} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import { TagInput } from '../../components/tag_input';
import {FormatTimerTimestamp} from '../../utils/date_utils';
import {FormatDuration} from '../../utils/time';
import {TimeNowContext} from './context';

import { useState } from "preact/hooks";


type TimerPanelProps = {
    timer: TblUserTimespan;
    stopTimer: (timer: TblUserTimespan) => void;
};

export const TimerPanel = ({timer, stopTimer}: TimerPanelProps) => {

    const running = timer.stop_time === 0;
    const [tags, setTags] = useState<string[]>([]);

    return (
        <div className="flex flex-row items-start sm:items-center container-theme p-2">
            <div className="w-full flex flex-col sm:flex-row">

            <TagInput value={tags} onChange={setTags} />

                <div className="flex items-center font-mono justify-evenly gap-2">
                    <div className="whitespace-nowrap">
                        <span>{FormatTimerTimestamp(timer.start_time)}</span>
                        <span className="text-faded mx-2">{'-'}</span>
                        {running ? (
                            <button className="px-2 py-1 border rounded text-xs" onClick={() => stopTimer(timer)}>
                                Stop
                            </button>
                        ) : (
                            <span>{FormatTimerTimestamp(timer.stop_time)}</span>
                        )}
                    </div>
                    {running ? (
                        <TimeNowContext.Consumer>
                            {(now) => <span className="whitespace-nowrap">{FormatDuration(now - timer.start_time)}</span>}
                        </TimeNowContext.Consumer>
                    ) : (
                        <span className="whitespace-nowrap">{FormatDuration(timer.stop_time - timer.start_time)}</span>
                    )}
                </div>
            </div>
            <DropdownButton actions={[
                    {
                        label: 'Continue',
                        onClick: () => {},
                    },
                    {label: 'Edit', onClick: () => {}},
                    {
                        label: 'Delete',
                        dangerous: true,
                        onClick: () => {},
                    },
                ]} />
        </div>
    );
};
