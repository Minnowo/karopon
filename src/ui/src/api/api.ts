import {TblUser, TblUserFoodLog, TblUserFood, TblUserEvent, InsertUserFoodLog} from './types';

export const base = 'http://localhost:9070';

export async function Logout(): Promise<boolean> {
    return await fetch(`${base}/api/logout`).then((r) => r.status === 200);
}

export async function WhoAmI(): Promise<TblUser | null> {
    const response = await fetch(`${base}/api/whoami`);

    if (response.status !== 200) {
        return null;
    }

    const json = await response.json();

    if (json === null) {
        return null;
    }

    return json as TblUser;
}

export async function UserFoods(): Promise<Array<TblUserFood> | null> {
    const response = await fetch(`${base}/api/foods`);

    if (response.status !== 200) {
        return null;
    }

    const json = await response.json();

    if (json === null) {
        return null;
    }

    return json as Array<TblUserFood>;
}
export async function UserEvents(): Promise<Array<TblUserEvent> | null> {
    const response = await fetch(`${base}/api/events`);

    if (response.status !== 200) {
        return null;
    }

    const json = await response.json();

    if (json === null) {
        return null;
    }

    return json as Array<TblUserEvent>;
}

export async function GetUserFoodLog(): Promise<Array<TblUserFoodLog> | null> {
    const response = await fetch(`${base}/api/foodlog`);

    if (response.status !== 200) {
        return null;
    }

    const json = await response.json();

    if (json === null) {
        return null;
    }

    return json as Array<TblUserFoodLog>;
}

export async function LogFood(food: InsertUserFoodLog): Promise<boolean> {
    const response = await fetch(`${base}/api/logfood`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(food),
    });

    if (response.status !== 200) {
        return false;
    }

    return true;
}
