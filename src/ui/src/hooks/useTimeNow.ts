import {useEffect, useRef, useState} from 'preact/hooks';

// A single shared setInterval, reference-counted across every caller of useTimeNow.
// There is only ever one timer running (ticking once a second), no matter how many
// components call the hook or what intervalMs they each ask for.
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(now: number) => void>();

const ensureTicking = () => {
    if (intervalId !== null) {
        return;
    }
    intervalId = setInterval(() => {
        const now = Date.now();
        listeners.forEach((listener) => listener(now));
    }, 1000);
};

const stopTickingIfUnused = () => {
    if (listeners.size === 0 && intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
};

// useTimeNow returns the current time. All callers share the same underlying 1s
// timer; each caller just gets its own local state update on tick, so only the
// component calling this hook re-renders - no context/provider required.
//
// intervalMs lets a caller re-render less often than the shared timer ticks (e.g.
// 10000 to only update every 10s) without spinning up a second timer - the shared
// tick still fires every second, but this caller only calls setState (and thus only
// re-renders) once intervalMs has actually elapsed since its last update.
export const useTimeNow = (enabled = true, intervalMs = 1000): number => {
    const [now, setNow] = useState<number>(() => Date.now());
    const lastEmitRef = useRef<number>(now);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const listener = (t: number) => {
            if (t - lastEmitRef.current >= intervalMs) {
                lastEmitRef.current = t;
                setNow(t);
            }
        };

        listeners.add(listener);
        ensureTicking();

        return () => {
            listeners.delete(listener);
            stopTickingIfUnused();
        };
    }, [enabled, intervalMs]);

    return now;
};
