export const SOUND_OPTIONS: Array<{value: string; label: string}> = [
    {value: 'none', label: 'None'},
    {value: 'chime', label: 'Chime'},
    {value: 'beep', label: 'Beep'},
    {value: 'ding', label: 'Ding'},
];

let sharedCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    try {
        if (!sharedCtx) {
            sharedCtx = new AudioContext();
        }
        return sharedCtx;
    } catch {
        return null;
    }
};

export const UnlockAudioContext = (): void => {
    const ctx = getAudioContext();

    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {
            // ignore - still locked, will retry on the next interaction
        });
    }
};

const playTone = (ctx: AudioContext, startTime: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
};

export const PlayReminderSound = (sound: string): void => {
    if (sound === 'none' || sound === '') {
        return;
    }

    try {
        const ctx = getAudioContext();

        if (!ctx) {
            return;
        }

        const now = ctx.currentTime;

        switch (sound) {
            case 'chime':
                playTone(ctx, now, 660, 0.25);
                playTone(ctx, now + 0.15, 990, 0.3);
                break;
            case 'beep':
                playTone(ctx, now, 880, 0.15);
                break;
            case 'ding':
                playTone(ctx, now, 1320, 0.5);
                break;
            default:
                return;
        }
    } catch {
        // ignore
    }
};
