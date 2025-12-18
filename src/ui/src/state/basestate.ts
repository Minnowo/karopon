import {Dispatch, StateUpdater} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent, UserEventFoodLog} from '../api/types';

export type BaseState = {
    user: TblUser;
    setUser: Dispatch<StateUpdater<TblUser | null>>;

    foods: TblUserFood[];
    setFoods: Dispatch<StateUpdater<TblUserFood[] | null>>;

    events: TblUserEvent[];
    setEvents: Dispatch<StateUpdater<TblUserEvent[] | null>>;

    eventlogs: UserEventFoodLog[];
    setEventLogs: Dispatch<StateUpdater<UserEventFoodLog[] | null>>;

    setErrorMsg: Dispatch<StateUpdater<string | null>>;
};
