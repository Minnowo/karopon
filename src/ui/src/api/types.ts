export type TblUser = {
    id: number;
    name: string;
    created: string;

    // settings
    user_id: number;
    dark_mode: boolean;
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
