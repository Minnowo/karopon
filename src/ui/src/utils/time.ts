const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const MONTH_IN_MS = 38 * DAY_IN_MS;

export const IsSameDay = (unixMs1: number, unixMs2: number): boolean => {
    const day1 = Math.floor(unixMs1 / DAY_IN_MS);
    const day2 = Math.floor(unixMs2 / DAY_IN_MS);
    return day1 === day2;
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
