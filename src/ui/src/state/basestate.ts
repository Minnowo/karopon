import {Dispatch, StateUpdater} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent, TblUserEventLog} from '../api/types';

export interface BaseState {
    user: TblUser;

    foods: TblUserFood[];
    setFoods: Dispatch<StateUpdater<Array<TblUserFood> | null>>;

    events: TblUserEvent[];
    setEvents: Dispatch<StateUpdater<Array<TblUserEvent> | null>>;

    eventlog: TblUserEventLog[];
    setEventlog: Dispatch<StateUpdater<Array<TblUserEventLog> | null>>;

    setErrorMsg: Dispatch<StateUpdater<string | null>>;
}
