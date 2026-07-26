export const RelTimeRe = /^now([+-])(\d+)([hdwmy])$/;

/**
 * Parses a relative time expression and returns the resolved time.
 *
 * `now` should already have the user's day offset subtracted.
 * `shiftMs` is the user's DayTimeOffsetSeconds converted to milliseconds.
 */
export const ParseRelativeTimeExpr = (expr: string, now: Date, shiftMs: number): Date => {
    if (!expr) {
        throw new Error('invalid range');
    }
    if (expr === 'now') {
        return new Date(now.getTime() + shiftMs);
    }

    const match = RelTimeRe.exec(expr.toLowerCase());
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
