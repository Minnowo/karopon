import {
    TblUser,
    TblUserFood,
    CreateUserEventLog,
    TblUserEvent,
    TblUserEventLog,
    UserEventFoodLog,
    TblUpdateUser,
    UpdateUserEventLog,
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

export const ApiGetUserFoods = (): Promise<TblUserFood[]> => {
    return fetchJson<TblUserFood[]>(fetch(`${base}/api/foods`));
};

export const ApiGetUserEvents = (): Promise<TblUserEvent[]> => {
    return fetchJson<TblUserEvent[]>(fetch(`${base}/api/events`));
};

export const ApiGetUserEventLog = (): Promise<TblUserEventLog[]> => {
    return fetchJson<TblUserEventLog[]>(fetch(`${base}/api/eventlogs`));
};

export const ApiGetUserEventFoodLog = (n = -1): Promise<UserEventFoodLog[]> => {
    return fetchJson<UserEventFoodLog[]>(fetch(`${base}/api/eventfoodlogs?n=${n}`));
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

export const ApiUpdateUserEventLog = (eventlog: UpdateUserEventLog): Promise<UserEventFoodLog> => {
    return fetchJson<UserEventFoodLog>(
        fetch(`${base}/api/eventfoodlog/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(eventlog),
        })
    );
};

export const ApiDeleteUserEventLog = (eventlog: TblUserEventLog): Promise<void> => {
    return fetchNone(
        fetch(`${base}/api/eventlog/delete`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(eventlog),
        })
    );
};

export const ApiNewEventLog = (food: CreateUserEventLog): Promise<UserEventFoodLog> => {
    return fetchJson<UserEventFoodLog>(
        fetch(`${base}/api/eventlog/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};
