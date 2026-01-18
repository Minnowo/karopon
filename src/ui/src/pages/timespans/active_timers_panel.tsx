import {useEffect, useState} from 'preact/hooks';
import {TblUserTimespan} from '../../api/types';
import {TimerPanel} from './timer_panel';
import {TimeNowContext} from './context';

type ActiveTimerPanelProps = {
    timers: TblUserTimespan[];
    stopTimer: (ts: TblUserTimespan) => void;
};

export const ActiveTimerPanel = ({timers, stopTimer}: ActiveTimerPanelProps) => {
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
                    {timers.map((ts: TblUserTimespan) => (
                        <TimerPanel key={ts.id} timer={ts} stopTimer={stopTimer} />
                    ))}
                </TimeNowContext.Provider>
            )}
        </div>
    );
};
