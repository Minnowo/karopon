import {GoalTargetColumn, GoalTimeExpr, TblUserGoal} from '../../api/types';
import {AggregationFunc, GroupBy} from '../../api/types_stats';
import {ApiGetBodyLogStatsTime, ApiGetStatsEventLog, ApiGetStatsMacro} from '../../api/api';
import {MacronutrientPoint} from '../../api/types_stats_macros';
import {ParseRelativeTimeExpr} from '../../utils/timerange';

export type GoalProgress = {
    currentValue: number;
    targetValue: number;
    timeRemaining: number;
};

// Mirrors the calendar-snapped ranges the old goal-progress endpoint produced via
// ParseGoalTimeExpression: [start, end) for the period the goal's time_expr currently falls in.
const TIME_EXPR_RANGE: Record<GoalTimeExpr, {start: string; end: string}> = {
    HOURLY: {start: 'now-0h', end: 'now+1h'},
    DAILY: {start: 'now-0d', end: 'now+1d'},
    WEEKLY: {start: 'now-0w', end: 'now+1w'},
    MONTHLY: {start: 'now-0m', end: 'now+1m'},
    YEARLY: {start: 'now-0y', end: 'now+1y'},
};

const MACRO_TARGET_KEY: Partial<Record<GoalTargetColumn, keyof MacronutrientPoint>> = {
    CALORIES: 'calorie',
    NET_CARBS: 'net_carb',
    CARBS: 'carb',
    FAT: 'fat',
    FIBRE: 'fibre',
    PROTEIN: 'protein',
};

export const GoalTargetTimeRemaining = (goal: TblUserGoal, dayOffsetSeconds: number): number => {
    const {end} = TIME_EXPR_RANGE[goal.time_expr];
    const now = new Date(Date.now() - dayOffsetSeconds * 1000);
    const endTime = ParseRelativeTimeExpr(end, now, dayOffsetSeconds * 1000);
    return endTime.getTime() - Date.now();
};

export const GetGoalCurrentValue = async (goal: TblUserGoal): Promise<number> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const {start, end} = TIME_EXPR_RANGE[goal.time_expr];

    const request = {
        start,
        end,
        groupby: GroupBy.One,
        aggregate: goal.aggregation_type as AggregationFunc,
        timezone,
    };

    if (goal.target_col === 'BLOOD_SUGAR') {
        const points = await ApiGetStatsEventLog(request);
        return points[0]?.blood_glucose ?? 0;
    }

    if (goal.target_col === 'BODY_METRIC') {
        if (!goal.target_metric) {
            return 0;
        }
        const points = await ApiGetBodyLogStatsTime({...request, metrics: [goal.target_metric]});
        return points[0]?.value ?? 0;
    }

    const macroKey = MACRO_TARGET_KEY[goal.target_col];
    if (macroKey) {
        const points = await ApiGetStatsMacro(request);
        return points[0]?.[macroKey] ?? 0;
    }

    return 0;
};
