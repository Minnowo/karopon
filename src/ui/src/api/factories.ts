import {
    TblUserFoodLog,
    UserEventFoodLog,
    TblUserFood,
    TblUserGoal,
    GoalComparisonTypeValues,
    GoalTimeExprValues,
    GoalTargetColumnValues,
    GoalAggregationTypeValues,
    TaggedTimespan,
} from './types';

export const NewTblUserGoal = (overrides: Partial<TblUserGoal> = {}): TblUserGoal => ({
    id: 0,
    user_id: 0,
    created: 0,
    name: '',
    target_value: 0,
    target_col: GoalTargetColumnValues[0],
    aggregation_type: GoalAggregationTypeValues[0],
    value_comparison: GoalComparisonTypeValues[0],
    time_expr: GoalTimeExprValues[1],
    ...overrides,
});

export const NewTaggedTimespan = (overrides: Partial<TaggedTimespan> = {}): TaggedTimespan => ({
    timespan: {
        id: 0,
        user_id: 0,
        created: 0,
        start_time: new Date().getTime(),
        stop_time: 0,
        note: null,
    },
    tags: [],
    ...overrides,
});

export const TblUserFoodFactory = {
    empty(): TblUserFood {
        return {
            id: 0,
            user_id: 0,
            name: '',
            unit: '',
            portion: 0,
            protein: 0,
            carb: 0,
            fibre: 0,
            fat: 0,
        };
    },
};

export const TblUserFoodLogFactory = {
    empty(id = 0): TblUserFoodLog {
        return {
            id,
            user_id: 0,
            food_id: 0,
            created: 0,
            user_time: 0,
            name: '',
            eventlog_id: 0,
            event_id: 0,
            event: '',
            unit: '',
            portion: 0,
            protein: 0,
            carb: 0,
            fibre: 0,
            fat: 0,
        };
    },
};

export const UserEventFoodLogFactory = {
    empty(): UserEventFoodLog {
        return {
            eventlog: {
                id: 0,
                user_id: 0,
                event_id: 0,
                created: 0,
                user_time: 0,
                event: '',
                net_carbs: 0,
                blood_glucose: 0,
                blood_glucose_target: 0,
                insulin_sensitivity_factor: 0,
                insulin_to_carb_ratio: 0,
                recommended_insulin_amount: 0,
                actual_insulin_taken: 0,
            },
            foodlogs: [TblUserFoodLogFactory.empty(), TblUserFoodLogFactory.empty(), TblUserFoodLogFactory.empty()],
            total_protein: 0,
            total_carb: 0,
            total_fibre: 0,
            total_fat: 0,
        };
    },
};
