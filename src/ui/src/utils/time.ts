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

export const TimeLocalMS = (time: Date) => {
    return time.getTime() - time.getTimezoneOffset() * 60 * 1000;
};
