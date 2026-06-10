// in go, this is database.GroupBy
export enum GroupBy {
    One = 'ONE',
    Second = 'SECOND',
    Minute = 'MINUTE',
    Hour = 'HOUR',
    Day = 'DAY',
    Week = 'WEEK',
    Month = 'MONTH',
    Year = 'YEAR',
}

// in go, this is database.AggregationFunc
export enum AggregationFunc {
    Sum = 'SUM',
    Avg = 'AVG',
    Min = 'MIN',
    Max = 'MAX',
}
