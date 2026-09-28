import {useEffect} from 'preact/hooks';
import {PlayReminderSound} from '../../utils/sound';
import {CueEvent} from './run_state';

// The one place run events become sound. TTS goes here later.
export const Cue = (e: CueEvent): void => {
    switch (e.type) {
        case 'countdown':
            PlayReminderSound('beep');
            break;
        case 'start':
        case 'step':
            PlayReminderSound('chime');
            break;
        case 'done':
            PlayReminderSound('ding');
            break;
    }
};

// Keeps the screen on while active. Does nothing where unsupported.
export const useWakeLock = (active: boolean): void => {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) {
            return;
        }

        let lock: WakeLockSentinel | null = null;
        let released = false;

        const request = () => {
            navigator.wakeLock
                .request('screen')
                .then((l) => {
                    if (released) {
                        l.release().catch(() => {});
                    } else {
                        lock = l;
                    }
                })
                .catch(() => {});
        };

        // The browser drops the lock when the tab is hidden.
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                request();
            }
        };

        request();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            released = true;
            document.removeEventListener('visibilitychange', onVisible);
            lock?.release().catch(() => {});
        };
    }, [active]);
};
