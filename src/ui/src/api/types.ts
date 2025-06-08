
export interface TblUser {
  id: number;
  name: string;
  created: string;
}

export interface TblConfig {
    version: string;
}

export interface TblEvent {
    id: number;
    name: string;
}

export interface TblUserEvent {
    id: number;
    user_id: number;
    event_id: number;
    created: string;
    user_time: string;
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
    food_id: number;
    created: string;
    user_time: string;
    name: string;

    event_id: number | null;
    event: string;

    unit: string;

    portion: number;
    protein: number;
    carb: number;
    fibre: number;
    fat: number;
}

