import {useEffect} from 'preact/hooks';
import {PlayReminderSound} from '../../utils/sound';
import {CueEvent, RunStep} from './run_state';
import {CueSettings} from './structure';

// e.g. "Push-ups, 12 reps" or "Squat, 8 reps, 60 kg".
const spokenStep = (st: RunStep): string => {
    const t = st.target;
    switch (st.kind) {
        case 'timed':
            return `${st.name}, ${t.seconds} seconds`;
        case 'reps':
            return `${st.name}, ${t.reps} reps`;
        case 'weighted':
            return `${st.name}, ${t.reps} reps, ${t.weight} ${t.unit}`.trim();
        case 'distance':
            return `${st.name}, ${t.distance} ${t.unit}`.trim();
    }
};

// interrupt drops anything still being said, so the new line is on time.
const speak = (text: string, interrupt: boolean): void => {
    if (!('speechSynthesis' in window)) {
        return;
    }
    if (interrupt) {
        speechSynthesis.cancel();
    }
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
};

export const StopSpeaking = (): void => {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
};

// The one place run events become sound, as the workout's cue settings allow.
export const Cue = (e: CueEvent, cues: CueSettings): void => {
    switch (e.type) {
        case 'next':
            if (cues.sayNext) {
                speak(`Next, ${e.next.name}`, true);
            }
            break;
        case 'countdown':
            if (cues.beeps) {
                PlayReminderSound('beep');
            }
            if (cues.sayCountdown) {
                speak(String(e.secondsLeft), false);
            }
            break;
        case 'start':
        case 'step':
            if (cues.beeps) {
                PlayReminderSound('chime');
            }
            if (cues.sayStep) {
                speak(spokenStep(e.step), true);
            }
            break;
        case 'done':
            if (cues.beeps) {
                PlayReminderSound('ding');
            }
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
