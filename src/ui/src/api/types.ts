export type TblUser = {
    id: number;
    name: string;
    created: string;

    // settings
    user_id: number;
    theme: string;
    show_diabetes: boolean;
    caloric_calc_method: string;
    insulin_sensitivity_factor: number;
    event_history_fetch_limit: number;
    target_blood_sugar: number;
    session_expire_time_seconds: number;
    time_format: string;
    date_format: string;
};

export type TblUpdateUser = {
    user: TblUser;
    new_password: string;
};

export type TblConfig = {
    version: string;
};

export type ServerTime = {
    time: number;
};

export type TblUserEvent = {
    id: number;
    user_id: number;
    name: string;
};

export type TblUserEventLog = {
    id: number;
    user_id: number;
    event_id: number;
    created: number;
    user_time: number;
    event: string;
    net_carbs: number;
    blood_glucose: number;
    blood_glucose_target: number;
    insulin_sensitivity_factor: number;
    insulin_to_carb_ratio: number;
    recommended_insulin_amount: number;
    actual_insulin_taken: number;
};

export type TblUserFood = {
    id: number;
    user_id: number;
    name: string;
    unit: string;
    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
};

export type TblUserFoodLog = {
    id: number;
    user_id: number;
    food_id: number | null;
    created: number;
    user_time: number;
    name: string;

    eventlog_id: number | null;
    event_id: number | null;
    event: string;

    unit: string;

    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
};

export type TblUserFoodLogWithKey = TblUserFoodLog & {
    key: number;
};

export type UserEventFoodLog = {
    eventlog: TblUserEventLog;
    foodlogs: TblUserFoodLog[];
    total_protein: number;
    total_carb: number;
    total_fibre: number;
    total_fat: number;
};

export type UpdateUserEventLog = {
    eventlog: TblUserEventLog;
    foodlogs: TblUserFoodLog[];
};

export type InsertUserFoodLog = {
    name: string;
    event: string;
    unit: string;
    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
};

export type CreateUserEventLog = {
    event: TblUserEvent;
    foods: InsertUserFoodLog[];
    blood_glucose: number;
    blood_glucose_target: number;
    insulin_sensitivity_factor: number;
    insulin_to_carb_ratio: number;
    recommended_insulin_amount: number;
    actual_insulin_taken: number;
    created_time: number;
};

export type TblUserBodyLog = {
    id: number;
    user_id: number;
    created: number;
    user_time: number;
    weight_kg: number;
    height_cm: number;
    body_fat_percent: number;
    bmi: number;
    bp_systolic: number;
    bp_diastolic: number;
    heart_rate_bpm: number;
    steps_count: number;
};

export type TblDataSource = {
    id: number;
    created: number;
    name: string;
    url: string;
    notes: string;
};
export type TblDataSourceFood = {
    id: number;
    data_source_id: number;
    created: number;

    name: string;
    unit: string;
    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
    data_source_row_int_id: number;
};

export const GoalTargetColumnValues = [
    'CALORIES',
    'NET_CARBS',
    'FAT',
    'CARBS',
    'FIBRE',
    'PROTEIN',
    'BODY_WEIGHT_KG',
    'BODY_WEIGHT_LBS',
    'BODY_FAT_PERCENT',
    'HEART_RATE',
    'STEPS',
    'BLOOD_PRESSURE_SYS',
    'BLOOD_PRESSURE_DIA',
    'BLOOD_SUGAR',
] as const;
export type GoalTargetColumn = (typeof GoalTargetColumnValues)[number];

export const GoalAggregationTypeValues = ['SUM', 'AVG', 'MIN', 'MAX'] as const;
export type GoalAggregationType = (typeof GoalAggregationTypeValues)[number];

export const GoalComparisonTypeValues = [
    'EQUAL_TO',
    'LESS_THAN',
    'GREATER_THAN',
    'LESS_THAN_OR_EQUAL_TO',
    'GREATER_THAN_OR_EQUAL_TO',
] as const;
export type GoalComparisonType = (typeof GoalComparisonTypeValues)[number];

export const GoalTimeExprValues = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type GoalTimeExpr = (typeof GoalTimeExprValues)[number];

export type TblUserGoal = {
    id: number;
    user_id: number;
    created: number;
    name: string;
    target_value: number;
    target_col: GoalTargetColumn;
    aggregation_type: GoalAggregationType;
    value_comparison: GoalComparisonType;
    time_expr: GoalTimeExpr;
};

export type CheckGoalProgress = TblUserGoal & {
    timezone: string;
};

export type UserGoalProgress = {
    current_value: number;
    target_value: number;
    time_remaining: number;
};

export type TblUserTag = {
    namespace: string;
    name: string;
};

export type TblUserTimespan = {
    id: number;
    user_id: number;
    created: number;

    start_time: number;
    stop_time: number;

    note: string | null;
};

export type TaggedTimespan = {
    timespan: TblUserTimespan;
    tags: TblUserTag[];
};
