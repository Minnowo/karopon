import {TblUser, TblUserFood, TblUserEvent} from '../api/types';

export interface BaseState {
    user: TblUser;
    foods: TblUserFood[];
    events: TblUserEvent[];
}
