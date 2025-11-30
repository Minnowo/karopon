import {TblUserFoodLog} from './types';

export const TblUserFoodLogFactory = {
    empty(): TblUserFoodLog {
        return {
            id: 0,
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
