import {Dispatch, StateUpdater} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent, TblUserEventLog, UserEventFoodLog} from '../api/types';

export interface BaseState {
    user: TblUser;
    setUser: Dispatch<StateUpdater<TblUser | null>>;

    foods: TblUserFood[];
    setFoods: Dispatch<StateUpdater<Array<TblUserFood> | null>>;

    events: TblUserEvent[];
    setEvents: Dispatch<StateUpdater<Array<TblUserEvent> | null>>;

    eventlog: TblUserEventLog[];
    setEventlog: Dispatch<StateUpdater<Array<TblUserEventLog> | null>>;

    eventlogs: UserEventFoodLog[];
    setEventLogs: Dispatch<StateUpdater<Array<UserEventFoodLog> | null>>;

    setErrorMsg: Dispatch<StateUpdater<string | null>>;
}
