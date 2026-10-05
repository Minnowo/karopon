// JS interfaces the Android app adds to the webview's window. Undefined in a regular browser.

type AndroidAlarmsBridge = {
    schedule(id: number, whenMillis: number, title: string, body: string, isAlarm: boolean, sound: string): void;
    cancel(id: number): void;
};

// The Android WebView has no speechSynthesis.
type AndroidTtsBridge = {
    speak(text: string, interrupt: boolean): void;
    stop(): void;
};

// colors is a JSON object of theme role (e.g. "on-primary") to "#rrggbb".
type AndroidThemeBridge = {
    setColors(colors: string): void;
};

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- global augmentation requires interface
    interface Window {
        AndroidAlarms?: AndroidAlarmsBridge;
        AndroidTts?: AndroidTtsBridge;
        AndroidTheme?: AndroidThemeBridge;
    }
}

// The --color-c-* roles the native UI maps onto its own theme.
const THEME_ROLES = [
    'primary',
    'on-primary',
    'primary-container',
    'on-primary-container',
    'secondary',
    'on-secondary',
    'secondary-container',
    'on-secondary-container',
    'tertiary',
    'on-tertiary',
    'tertiary-container',
    'on-tertiary-container',
    'error',
    'on-error',
    'error-container',
    'on-error-container',
    'surface',
    'on-surface',
    'on-surface-variant',
    'surface-container-1',
    'surface-container-2',
    'surface-container-3',
    'surface-container-4',
    'surface-dim',
    'surface-bright',
    'outline',
    'outline-variant',
    'inverse-surface',
    'inverse-on-surface',
    'inverse-primary',
];

// Sends the page's current theme colors to the Android app, if running in it.
export const SyncAndroidTheme = (): void => {
    const bridge = window.AndroidTheme;
    if (!bridge) {
        return;
    }

    // Custom CSS can use any color syntax, so draw each one to get plain sRGB.
    const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    if (!ctx) {
        return;
    }

    const style = getComputedStyle(document.documentElement);
    const colors: Record<string, string> = {};

    for (const role of THEME_ROLES) {
        const value = style.getPropertyValue(`--color-c-${role}`).trim();
        if (value === '') {
            continue;
        }

        // An invalid color leaves fillStyle unchanged, so it draws nothing and is skipped.
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = 'transparent';
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) {
            continue;
        }
        colors[role] = `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    }

    bridge.setColors(JSON.stringify(colors));
};
