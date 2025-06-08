export function formatSmartTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    const isSameDay =
        date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

    if (isSameDay) {
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h24',
        });
    }

    const isSameYear = date.getFullYear() === now.getFullYear();

    // Show date, with or without year
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h24',
        ...(isSameYear ? {} : {year: 'numeric'}),
    });
}
