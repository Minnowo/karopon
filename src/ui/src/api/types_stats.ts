// in go, this is database.GroupBy
export enum GroupBy {
    Second = 'SECOND',
    Minute = 'MINUTE',
    Hour = 'HOUR',
    Day = 'DAY',
    Week = 'WEEK',
    Month = 'MONTH',
    Year = 'YEAR',
    One = 'ONE',
}

// in go, this is database.AggregationFunc
export enum AggregationFunc {
    Sum = 'SUM',
    Avg = 'AVG',
    Min = 'MIN',
    Max = 'MAX',
}
