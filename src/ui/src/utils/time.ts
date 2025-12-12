const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const MONTH_IN_MS = 28 * DAY_IN_MS;

export const Within24Hour = (unixMs1: number, unixMs2: number): boolean => {
    return Math.abs(unixMs1 - unixMs2) <= DAY_IN_MS;
};

export const WithinWeek = (unixMs1: number, unixMs2: number): boolean => {
    return Math.abs(unixMs1 - unixMs2) <= WEEK_IN_MS;
};

export const WithinMonth = (unixMs1: number, unixMs2: number): boolean => {
    return Math.abs(unixMs1 - unixMs2) <= MONTH_IN_MS;
};
