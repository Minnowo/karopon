export const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const WEEK_IN_MS = 7 * DAY_IN_MS;
export const MONTH_IN_MS = 28 * DAY_IN_MS;

export const FormatDuration = (ms: number): string => {
    let s = Math.floor(ms / 1000);

    const parts: string[] = [];

    const units = [
        [86400, 'd'],
        [3600, 'h'],
        [60, 'm'],
        [1, 's'],
    ] as const;

    for (const [unit, label] of units) {
        const value = Math.floor(s / unit);
        if (value > 0) {
            parts.push(`${value}${label}`);
        }
        s %= unit;
    }

    return parts.join(' ') || '0s';
};

export const Within24Hour = (unixMs1: number, unixMs2: number): boolean => {
    return Math.abs(unixMs1 - unixMs2) <= DAY_IN_MS;
};

export const WithinWeek = (unixMs1: number, unixMs2: number): boolean => {
    return Math.abs(unixMs1 - unixMs2) <= WEEK_IN_MS;
};

export const WithinMonth = (unixMs1: number, unixMs2: number): boolean => {
    return Math.abs(unixMs1 - unixMs2) <= MONTH_IN_MS;
};

/**
 * Returns the start timestamp (ms) for a day-grouped range, so the oldest
 * day is included in full rather than cut off at the current hour.
 * For '24 hours' returns now - 24h (time-based, not day-based).
 * For '7 days' / '28 days' returns the start of the logical day N-1 days ago,
 * where the day boundary is shifted by dayOffsetSeconds.
 */
export const StartOfRangeMs = (nowMs: number, dayOffsetSeconds: number, numDays: number): number => {
    // Find the start of the current logical day in adjusted time
    const adjustedNow = new Date(nowMs - dayOffsetSeconds * 1000);
    const startOfAdjustedToday = new Date(adjustedNow.getFullYear(), adjustedNow.getMonth(), adjustedNow.getDate()).getTime();
    // Shift back to real time, then go back (numDays - 1) full days
    return startOfAdjustedToday + dayOffsetSeconds * 1000 - (numDays - 2) * DAY_IN_MS;
};

export const TimeLocalMS = (time: Date) => {
    return time.getTime() - time.getTimezoneOffset() * 60 * 1000;
};
