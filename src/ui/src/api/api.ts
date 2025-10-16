import {TblUser, TblUserFoodLog, TblUserFood, CreateUserEventLog, TblUserEvent, InsertUserFoodLog} from './types';

// export const base = 'http://localhost:9070';
export const base = '';

async function throwFailureReason(r: Response) {
    const reason = await r.text();
    throw new Error(`Request failed with status ${r.status}: ${reason}`);
}

function rethrow(err: unknown): never {
    console.error('Caught error: ', err);
    if (err instanceof Error) {
        throw err;
    }
    throw new Error(String(err));
}

export async function Logout(): Promise<boolean> {
    return fetch(`${base}/api/logout`).then((r) => r.status === 200);
}

export async function WhoAmI(): Promise<TblUser> {
    try {
        const response = await fetch(`${base}/api/whoami`);

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return await response.json();
    } catch (err: unknown) {
        rethrow(err);
    }
}

export async function UserFoods(): Promise<Array<TblUserFood>> {
    try {
        const response = await fetch(`${base}/api/foods`);

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return await response.json();
    } catch (err: unknown) {
        rethrow(err);
    }
}

export async function UpdateUserFood(food: TblUserFood): Promise<boolean> {
    try {
        const response = await fetch(`${base}/api/food/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        });

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return true;
    } catch (err: unknown) {
        rethrow(err);
    }
}

export async function UserEvents(): Promise<Array<TblUserEvent>> {
    try {
        const response = await fetch(`${base}/api/events`);

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return await response.json();
    } catch (err: unknown) {
        rethrow(err);
    }
}

export async function GetUserFoodLog(): Promise<Array<TblUserFoodLog>> {
    try {
        const response = await fetch(`${base}/api/foodlog`);

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return await response.json();
    } catch (err: unknown) {
        rethrow(err);
    }
}

export async function LogFood(food: InsertUserFoodLog): Promise<TblUserFoodLog> {
    try {
        const response = await fetch(`${base}/api/logfood`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        });

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return await response.json();
    } catch (err: unknown) {
        rethrow(err);
    }
}

export async function LogEvent(food: CreateUserEventLog): Promise<TblUserFoodLog> {
    try {
        const response: Response = await fetch(`${base}/api/logevent`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        });

        if (response.status !== 200) {
            await throwFailureReason(response);
        }

        return await response.json();
    } catch (err: unknown) {
        rethrow(err);
    }
}
