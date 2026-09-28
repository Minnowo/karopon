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
    event_log_trailing_rows: number;
    day_time_offset_seconds: number;
    fill_eventlog_from_last: boolean;
    timespan_history_fetch_limit: number;
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
    eventlog_id: number;
    food_id: number | null;
    created: number;
    user_time: number;
    name: string;

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
    photo_ids: number[];
};

export type TblUserBodyLog = {
    id: number;
    user_id: number;
    created: number;
    user_time: number;
};

export type TblUserBodyMetric = {
    id: number;
    user_id: number;
    name: string;
    unit: string;
};

export type TblUserBodyLogMetric = {
    bodylog_id: number;
    body_metric_id: number;
    value: number;
};

export type UserBodyLog = {
    bodylog: TblUserBodyLog;
    metrics: TblUserBodyLogMetric[];
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
    'BLOOD_SUGAR',
    'BODY_METRIC',
    'TIME',
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
    target_metric: string;
    aggregation_type: GoalAggregationType;
    value_comparison: GoalComparisonType;
    time_expr: GoalTimeExpr;
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

export type TblUserActivity = {
    id: number;
    name: string;
    duration: number;
    note: string;
};

export type ActivityWithTag = {
    activity: TblUserActivity;
    tag: TblUserTag;
};

export type NewUserActivityRequest = {
    name: string;
    tag_namespace: string;
    tag_name: string;
    duration: number;
    note: string;
};

export type UpdateUserActivityRequest = {
    id: number;
    name: string;
    tag_namespace: string;
    tag_name: string;
    duration: number;
    note: string;
};

// "random" suggests one linked activity at random when a reminder fires; "all" shows
// every linked activity at once.
export type ReminderActivityMode = 'random' | 'all';

export type ReminderAlarmMode = 'reminder' | 'alarm';

export type TblUserReminder = {
    id: number;
    name: string;
    enabled: boolean;
    interval_minutes: number;
    last_activity_at: number;
    activity_mode: ReminderActivityMode;
    sound: string;
    alarm_mode: ReminderAlarmMode;
    // Minimal cron-like schedule string: "D:HHMM-HHMM" windows (day 0=Sun..6=Sat)
    // joined by the ASCII Unit Separator - see utils/reminder_schedule.ts, which
    // mirrors goalspage/goal_progress.ts's tag encoding. Empty string means the
    // reminder never fires.
    cron: string;
    // JSON object mapping activity ID -> the currently running timespan ID for that
    // activity, e.g. '{"3":41}'. Lets a start/stop timer survive a page reload or a
    // different device. See utils/active_timers.ts for parse/stringify helpers.
    active_timers: string;
};

export type ReminderWithActivities = {
    reminder: TblUserReminder;
    activities: ActivityWithTag[];
};

export type NewUserReminder = {
    reminder: TblUserReminder;
    activity_ids: number[];
};

export type SetUserReminderActivitiesRequest = {
    reminder_id: number;
    activity_ids: number[];
};

export type UserSession = {
    created: number;
    expires: number;
    user_agent: string;
    token_id: string;
    is_current: boolean;
};

export type TblUserDashboard = {
    id: number;
    user_id: number;
    name: string;
    data: string;
};

export type TblUserTagColor = {
    user_id: number;
    namespace: string;
    color: string;
};

export enum UserTimeFormat {
    Auto = '24-hour',
    Hour24 = '24-hour',
    Hour12 = '12-hour',
}

export const StepKindValues = ['timed', 'reps', 'weighted', 'distance'] as const;
export type StepKind = (typeof StepKindValues)[number];

export type TblUserExercise = {
    id: number;
    user_id: number;
    name: string;
    note: string;
};

export type ExerciseWithTags = {
    exercise: TblUserExercise;
    tags: TblUserTag[];
};

export type TblUserWorkout = {
    id: number;
    user_id: number;
    name: string;
    note: string;
    // JSON blob holding the workout's sets and steps.
    structure: string;
};

export type WorkoutWithTags = {
    workout: TblUserWorkout;
    tags: TblUserTag[];
};

export type TblUserWorkoutLog = {
    id: number;
    user_id: number;
    workout_id: number | null;
    created: number;
    name: string;
    start_time: number;
    stop_time: number;
    // Time spent paused, in ms.
    paused_ms: number;
    completed: boolean;
    note: string;
};

export type TblUserWorkoutStepLog = {
    id: number;
    user_id: number;
    workoutlog_id: number;
    exercise_id: number | null;

    name: string;
    kind: StepKind;
    // Where the step was in the workout when it ran, all counting from 1.
    set: number;
    round: number;
    step: number;

    target_seconds: number;
    target_reps: number;
    target_weight: number;
    target_distance: number;
    actual_reps: number;
    actual_weight: number;
    actual_distance: number;
    // Unit for weight or distance, e.g. kg or km.
    unit: string;
    // Seconds spent on the step, not counting pauses. 0 means it was skipped.
    actual_seconds: number;
};

export type TimeSegment = {
    start_time: number;
    stop_time: number;
};

export type WorkoutLogWithSteps = {
    workoutlog: TblUserWorkoutLog;
    steps: TblUserWorkoutStepLog[];
};

export type NewWorkoutLogStep = {
    step: TblUserWorkoutStepLog;
    // In the order they happened. They set the step's actual_seconds and are not stored.
    segments: TimeSegment[];
    // The backend creates one timespan per segment with these tags. Empty tags creates none.
    tags: TblUserTag[];
};

export type NewWorkoutLog = {
    workoutlog: TblUserWorkoutLog;
    steps: NewWorkoutLogStep[];
};
