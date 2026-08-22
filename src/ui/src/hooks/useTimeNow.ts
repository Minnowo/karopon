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
// component calling this hook re-renders.
export const useTimeNow = (enabled = true, intervalMs = 0): number => {
    const [now, setNow] = useState<number>(() => Date.now());
    const tickMsRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const listener = (t: number) => {
            tickMsRef.current += 1000;

            if (tickMsRef.current >= intervalMs) {
                tickMsRef.current = 0;
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
