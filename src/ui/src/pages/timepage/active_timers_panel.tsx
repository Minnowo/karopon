import {Dispatch, StateUpdater} from 'preact/hooks';
import {TaggedTimespan, TblUserTimespan, UserTimeFormat} from '../../api/types';
import {TimerPanel} from './timer_panel';

type ActiveTimerPanelProps = {
    timeformat: UserTimeFormat;
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[]>>;
    tagColors?: Map<string, string>;
    timers: TaggedTimespan[];
    updateTimespan: (timer: TblUserTimespan) => void;
    updateTags: (timer: TaggedTimespan) => void;
    stopTimer: (timer: TaggedTimespan) => void;
    continueTimer: (timer: TaggedTimespan) => void;
    editTimer: (timer: TaggedTimespan) => void;
    deleteTimer: (timer: TaggedTimespan) => void;
};

export const ActiveTimerPanel = ({
    timeformat,
    namespaces,
    setNamespaces,
    tagColors,
    timers,
    updateTimespan,
    updateTags,
    stopTimer,
    continueTimer,
    editTimer,
    deleteTimer,
}: ActiveTimerPanelProps) => {
    if (timers.length <= 0) {
        return;
    }

    return (
        <div className="grid gap-2">
            <h1 className="mb-0"> Active Timers </h1>
            {timers.map((ts: TaggedTimespan) => (
                <TimerPanel
                    key={ts.timespan.id}
                    timeformat={timeformat}
                    namespaces={namespaces}
                    setNamespaces={setNamespaces}
                    tagColors={tagColors}
                    timer={ts}
                    updateTimespan={updateTimespan}
                    updateTags={updateTags}
                    continueTimer={continueTimer}
                    deleteTimer={deleteTimer}
                    editTimer={editTimer}
                    stopTimer={stopTimer}
                />
            ))}
        </div>
    );
};
