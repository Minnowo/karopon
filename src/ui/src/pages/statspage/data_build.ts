import {GroupBy} from '../../api/types_stats';

export const DateToGroupByBucket = (groupBy: GroupBy, d: Date): number => {
    switch (groupBy) {
        default:
        case GroupBy.One: {
            return 0;
        }
        case GroupBy.Second: {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()).getTime();
        }
        case GroupBy.Minute: {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
        }
        case GroupBy.Hour: {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
        }
        case GroupBy.Day: {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        }
        case GroupBy.Week: {
            // get start of week (assuming Monday as start)
            const day = d.getDay(); // 0 = Sunday
            const diff = day === 0 ? -6 : 1 - day; // shift to Monday

            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() + diff);

            return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
        }
        case GroupBy.Month: {
            return new Date(d.getFullYear(), d.getMonth()).getTime();
        }
        case GroupBy.Year: {
            return new Date(d.getFullYear(), 0, 1).getTime();
        }
    }
};

const relTimeRe = /^now([+-])(\d+)([hdwmy])$/;

/**
 * Parses a relative time expression and returns the resolved time.
 *
 * `now` should already have the user's day offset subtracted.
 * `shiftMs` is the user's DayTimeOffsetSeconds converted to milliseconds.
 */
export const ParseRelativeTimeExpr = (expr: string, now: Date, shiftMs: number): Date => {
    if (expr === 'now') {
        return new Date(now.getTime() + shiftMs);
    }

    const match = relTimeRe.exec(expr);
    if (!match) {
        throw new Error(`invalid relative time expression: "${expr}"`);
    }

    let n = parseInt(match[2], 10);
    if (match[1] === '-') {
        n = -n;
    }

    switch (match[3]) {
        case 'h': {
            const snap = new Date(now);
            snap.setMinutes(0, 0, 0);
            snap.setHours(snap.getHours() + n);
            return new Date(snap.getTime() + shiftMs);
        }

        case 'd': {
            const snap = new Date(now);
            snap.setHours(0, 0, 0, 0);
            snap.setDate(snap.getDate() + n);
            return new Date(snap.getTime() + shiftMs);
        }

        case 'w': {
            // Mirror the Go implementation: add shift first, then walk back to Monday.
            const base = new Date(now.getTime() + shiftMs);

            while (base.getDay() !== 1) {
                base.setDate(base.getDate() - 1);
            }

            base.setDate(base.getDate() + n * 7);
            return base;
        }

        case 'm': {
            const snap = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            snap.setMonth(snap.getMonth() + n);
            return new Date(snap.getTime() + shiftMs);
        }

        case 'y': {
            const snap = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            snap.setFullYear(snap.getFullYear() + n);
            return new Date(snap.getTime() + shiftMs);
        }

        default:
            // Unreachable: regex constrains unit to [hdwmy].
            throw new Error(`unknown unit in expression: "${expr}"`);
    }
};
