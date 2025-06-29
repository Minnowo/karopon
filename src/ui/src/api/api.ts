import {TblUser, TblUserFoodLog, TblUserFood, TblUserEvent, InsertUserFoodLog} from './types';

export const base = 'http://localhost:9070';

export async function Logout(): Promise<boolean> {
    return await fetch(`${base}/api/logout`).then((r) => r.status === 200);
}

export async function WhoAmI(): Promise<TblUser | null> {
    try {
        const response = await fetch(`${base}/api/whoami`);

        if (response.status !== 200) {
            return null;
        }

        const json = await response.json();

        if (json === null) {
            return null;
        }

        return json as TblUser;
    } catch (error: unknown) {
        let msg;
        if (error instanceof Error) {
            msg = error.message;
        } else {
            msg = error;
        }
        console.error('Error getting user:', msg);
        return null;
    }
}

export async function UserFoods(): Promise<Array<TblUserFood> | null> {
    try {
        const response = await fetch(`${base}/api/foods`);

        if (response.status !== 200) {
            return null;
        }

        const json = await response.json();

        if (json === null) {
            return null;
        }

        return json as Array<TblUserFood>;
    } catch (error: unknown) {
        let msg;
        if (error instanceof Error) {
            msg = error.message;
        } else {
            msg = error;
        }
        console.error('Error getting user foods:', msg);
        return null;
    }
}

export async function UpdateUserFood(food : TblUserFood): Promise<boolean> {
    try {
        const response = await fetch(`${base}/api/food/update`, {
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
    } catch (error: unknown) {
        let msg;
        if (error instanceof Error) {
            msg = error.message;
        } else {
            msg = error;
        }
        console.error('Error getting user events:', msg);
        return false;
    }
}

export async function UserEvents(): Promise<Array<TblUserEvent> | null> {
    try {
        const response = await fetch(`${base}/api/events`);

        if (response.status !== 200) {
            return null;
        }

        const json = await response.json();

        if (json === null) {
            return null;
        }

        return json as Array<TblUserEvent>;
    } catch (error: unknown) {
        let msg;
        if (error instanceof Error) {
            msg = error.message;
        } else {
            msg = error;
        }
        console.error('Error getting user events:', msg);
        return null;
    }
}

export async function GetUserFoodLog(): Promise<Array<TblUserFoodLog> | null> {
    try {
        const response = await fetch(`${base}/api/foodlog`);

        if (response.status !== 200) {
            return null;
        }

        const json = await response.json();

        if (json === null) {
            return null;
        }

        return json as Array<TblUserFoodLog>;
    } catch (error: unknown) {
        let msg;
        if (error instanceof Error) {
            msg = error.message;
        } else {
            msg = error;
        }
        console.error('Error getting food log:', msg);
        return null;
    }
}

export async function LogFood(food: InsertUserFoodLog): Promise<TblUserFoodLog | null> {
    try {
        const response = await fetch(`${base}/api/logfood`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        });

        if (response.status !== 200) {
            return null;
        }

        return await response.json();
    } catch (error: unknown) {
        let msg;
        if (error instanceof Error) {
            msg = error.message;
        } else {
            msg = error;
        }
        console.error('Error creating food log:', msg);
        return null;
    }
}
