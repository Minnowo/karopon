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
