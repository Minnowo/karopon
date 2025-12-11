import {
    TblUser,
    TblUserFood,
    CreateUserEventLog,
    TblUserEvent,
    TblUserEventLog,
    UserEventLogWithFoodLog,
    TblUpdateUser,
} from './types';

// export const base = 'http://localhost:9070';
export const base = '';

const throwFailureReason = async (r: Response): Promise<never> => {
    const reason = await r.text();
    throw new Error(`Request failed with status ${r.status}: ${reason}`);
};

const fetchNone = async (req: Promise<Response>): Promise<void> => {
    const response = await req;

    if (response.status !== 200) {
        await throwFailureReason(response);
    }
};

const fetchJson = async <T>(req: Promise<Response>): Promise<T> => {
    const response = await req;

    if (response.status !== 200) {
        await throwFailureReason(response);
    }

    return (await response.json()) as T;
};

export const ApiLogout = async (): Promise<boolean> => {
    return fetch(`${base}/api/logout`).then((r) => r.status === 200);
};

export const ApiWhoAmI = (): Promise<TblUser> => {
    return fetchJson<TblUser>(fetch(`${base}/api/whoami`));
};

export const ApiGetUserFoods = (): Promise<Array<TblUserFood>> => {
    return fetchJson<Array<TblUserFood>>(fetch(`${base}/api/foods`));
};

export const ApiGetUserEvents = (): Promise<Array<TblUserEvent>> => {
    return fetchJson<Array<TblUserEvent>>(fetch(`${base}/api/events`));
};

export const ApiGetUserEventLog = (): Promise<Array<TblUserEventLog>> => {
    return fetchJson<Array<TblUserEventLog>>(fetch(`${base}/api/eventlogs`));
};

export const ApiGetUserEventLogWithFoodLog = (n: number = -1): Promise<Array<UserEventLogWithFoodLog>> => {
    return fetchJson<Array<UserEventLogWithFoodLog>>(fetch(`${base}/api/eventlogs_with_foodlogs?n=${n}`));
};

export const ApiUpdateUser = (user: TblUpdateUser): Promise<TblUser> => {
    return fetchJson<TblUser>(
        fetch(`${base}/api/user/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(user),
        })
    );
};

export const ApiUpdateUserFood = (food: TblUserFood): Promise<void> => {
    return fetchNone(
        fetch(`${base}/api/food/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};

export const ApiNewUserFood = (food: TblUserFood): Promise<TblUserFood> => {
    return fetchJson<TblUserFood>(
        fetch(`${base}/api/food/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};

export const ApiDeleteUserFood = (food: TblUserFood): Promise<void> => {
    return fetchNone(
        fetch(`${base}/api/food/delete`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};

export const ApiUpdateUserEventLog = (eventlog: TblUserEventLog): Promise<void> => {
    return fetchNone(
        fetch(`${base}/api/eventlog/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(eventlog),
        })
    );
};

export const ApiNewEventLog = (food: CreateUserEventLog): Promise<UserEventLogWithFoodLog> => {
    return fetchJson<UserEventLogWithFoodLog>(
        fetch(`${base}/api/eventlog/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};
