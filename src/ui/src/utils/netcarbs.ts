import {TblUserFoodLog} from '../api/types';

export function calcNetCarbs(food: TblUserFoodLog): number {
    const netCarbs = food.carb - food.fibre;
    return netCarbs;
}
