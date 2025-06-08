import { TblUser, TblUserFood } from "../api/types";

export interface BaseState {
    user: TblUser;
    foods: TblUserFood[];
}
