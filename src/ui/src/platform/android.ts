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

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- global augmentation requires interface
    interface Window {
        AndroidAlarms?: AndroidAlarmsBridge;
        AndroidTts?: AndroidTtsBridge;
    }
}

export {};
