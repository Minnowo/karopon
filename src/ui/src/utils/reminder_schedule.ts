// Minimal cron-like schedule string for reminders: a flat list of "D:HHMM-HHMM"
// windows (day 0=Sunday..6=Saturday matching JS Date.getDay(), HHMM-HHMM inclusive on
// both ends, same-day only) joined by the ASCII Unit Separator (0x1F), mirroring how
// goalspage/goal_progress.ts encodes goal tags into TblUserGoal.target_metric. It
// can't be typed by the user, and unlike NUL (0x00) it's a valid byte in a Postgres
// text/varchar column. This is entirely a frontend concern - the backend just stores
// the opaque string (TblUserReminder.cron).
const WINDOW_DELIMITER = '\x1f';

export type ScheduleWindow = {
    dayOfWeek: number; // 0-6
    startMinute: number; // 0-1439, inclusive
    endMinute: number; // 0-1439, inclusive, >= startMinute
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const minutesToHHMM = (min: number): string => `${pad2(Math.floor(min / 60))}${pad2(min % 60)}`;

const hhmmToMinutes = (hhmm: string): number => {
    const h = parseInt(hhmm.slice(0, 2), 10);
    const m = parseInt(hhmm.slice(2, 4), 10);
    return h * 60 + m;
};

// For display (e.g. the read-only "Wed 07:00-12:00" summary); "HH:MM", always 24-hour,
// matching how other read-only time displays in the app behave (see date_utils.ts).
export const MinutesToTimeInputValue = (min: number): string => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;

// For the editable TimeInput component, which takes a Date and handles 12h/24h display
// itself via its hour12 prop; the date part is irrelevant, only hours/minutes are read.
export const MinutesToDate = (min: number): Date => {
    const d = new Date();
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    return d;
};

export const ParseCronSchedule = (cron: string): ScheduleWindow[] => {
    const windows: ScheduleWindow[] = [];

    for (const entry of cron.split(WINDOW_DELIMITER)) {
        if (!entry) {
            continue;
        }

        const [dayStr, rangeStr] = entry.split(':');
        const dayOfWeek = parseInt(dayStr, 10);

        if (Number.isNaN(dayOfWeek) || !rangeStr) {
            continue;
        }

        const [startStr, endStr] = rangeStr.split('-');
        if (!startStr || !endStr) {
            continue;
        }

        windows.push({
            dayOfWeek,
            startMinute: hhmmToMinutes(startStr),
            endMinute: hhmmToMinutes(endStr),
        });
    }

    return windows;
};

export const FormatCronSchedule = (windows: ScheduleWindow[]): string =>
    windows
        .slice()
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
        .map((w) => `${w.dayOfWeek}:${minutesToHHMM(w.startMinute)}-${minutesToHHMM(w.endMinute)}`)
        .join(WINDOW_DELIMITER);

export const IsWithinSchedule = (windows: ScheduleWindow[], date: Date): boolean => {
    const day = date.getDay();
    const minuteOfDay = date.getHours() * 60 + date.getMinutes();

    return windows.some((w) => w.dayOfWeek === day && minuteOfDay >= w.startMinute && minuteOfDay <= w.endMinute);
};

export const AllDayEveryDayWindows = (): ScheduleWindow[] => {
    const windows: ScheduleWindow[] = [];

    for (let d = 0; d < 7; d++) {
        windows.push({dayOfWeek: d, startMinute: 0, endMinute: 1439});
    }

    return windows;
};
