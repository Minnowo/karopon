import {useEffect, useState} from 'preact/hooks';
import {TaggedTimespan} from '../../api/types';
import {TimerPanel} from './timer_panel';
import {TimeNowContext} from './context';

type ActiveTimerPanelProps = {
    timers: TaggedTimespan[];
    updateTags: (timer: TaggedTimespan) => void;
    stopTimer: (timer: TaggedTimespan) => void;
    continueTimer: (timer: TaggedTimespan) => void;
    editTimer: (timer: TaggedTimespan) => void;
    deleteTimer: (timer: TaggedTimespan) => void;
};

export const ActiveTimerPanel = ({
    timers,
    updateTags,
    stopTimer,
    continueTimer,
    editTimer,
    deleteTimer,
}: ActiveTimerPanelProps) => {
    const [timeNow, setTimeNow] = useState<number>(Date.now());

    useEffect(() => {
        if (timers.length <= 0) {
            return;
        }

        const ticker = setInterval(() => setTimeNow(Date.now()), 1000);

        return () => clearInterval(ticker);
    }, [timers]);

    if (timers.length <= 0) {
        return;
    }

    return (
        <div className="grid gap-2">
            <h1> Active Timers </h1>
            {timers.length > 0 && (
                <TimeNowContext.Provider value={timeNow}>
                    {timers.map((ts: TaggedTimespan) => (
                        <TimerPanel
                            key={ts.timespan.id}
                            timer={ts}
                            updateTags={updateTags}
                            continueTimer={continueTimer}
                            deleteTimer={deleteTimer}
                            editTimer={editTimer}
                            stopTimer={stopTimer}
                        />
                    ))}
                </TimeNowContext.Provider>
            )}
        </div>
    );
};
