import {Dispatch, StateUpdater} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent} from '../api/types';

export interface BaseState {
    user: TblUser;

    foods: TblUserFood[];
    setFoods: Dispatch<StateUpdater<Array<TblUserFood> | null>>;

    events: TblUserEvent[];
    setEvents: Dispatch<StateUpdater<Array<TblUserEvent> | null>>;
}
