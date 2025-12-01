export interface TblUser {
    id: number;
    name: string;
    created: string;
}

export interface TblConfig {
    version: string;
}

export interface TblUserEvent {
    id: number;
    user_id: number;
    name: string;
}

export interface TblUserEventLog {
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
}

export interface TblUserFood {
    id: number;
    user_id: number;
    name: string;
    unit: string;
    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
}

export interface TblUserFoodLog {
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
}

export interface UserEventLogWithFoodLog {
    eventlog: TblUserEventLog;
    foodlogs: TblUserFoodLog[];
    total_protein: number;
    total_carb: number;
    total_fibre: number;
    total_fat: number;
}

export interface InsertUserFoodLog {
    name: string;
    event: string;
    unit: string;
    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
}

export interface CreateUserEventLog {
    event: TblUserEvent;
    foods: InsertUserFoodLog[];
    blood_glucose: number;
    blood_glucose_target: number;
    insulin_sensitivity_factor: number;
    insulin_to_carb_ratio: number;
    recommended_insulin_amount: number;
    actual_insulin_taken: number;
}

export interface TblUserSettings {
    id: number;
    user_id: number;
    dark_mode: boolean;
    show_diabetes: boolean;
    caloric_calc_method: string;
    insulin_sensitivity_factor: boolean;
}
