export function NowISOStr(): string {
    return new Date().toISOString().slice(0, 16);
}

export const FormatDateForInput = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
        // eslint-disable-next-line prefer-template
        date.getFullYear() +
        '-' +
        pad(date.getMonth() + 1) +
        '-' +
        pad(date.getDate()) +
        'T' +
        pad(date.getHours()) +
        ':' +
        pad(date.getMinutes())
    );
};

export function FormatSmartTimestamp2(date: Date): string {
    const now = new Date();

    const isSameYear = date.getFullYear() === now.getFullYear();

    // Show date, with or without year
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        ...(isSameYear ? {} : {year: 'numeric'}),
    });
}
export function FormatSmartTimestamp(timestamp: number): string {
    return FormatSmartTimestamp2(new Date(timestamp));
}

export function FormatTimerTimestamp(ms: number): string {
    const date = new Date(ms);

    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });
}
