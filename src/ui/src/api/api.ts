import {GetCookieValue} from '../utils/cookies';
import {LocalGetServer, LocalStoreServer} from '../utils/localstate';
import {
    TblUser,
    TblUserFood,
    CreateUserEventLog,
    TblUserEvent,
    TblUserEventLog,
    UserEventFoodLog,
    TblUpdateUser,
    UpdateUserEventLog,
    TblUserBodyLog,
    TblDataSource,
    TblDataSourceFood,
    TblUserGoal,
    UserGoalProgress,
    CheckGoalProgress,
    TblUserTag,
    TblUserTimespan,
} from './types';

export class ApiError extends Error {
    public readonly status: number;

    constructor(status: number, reason: string) {
        super(`Request failed with status ${status}: ${reason}`);
        this.name = 'HttpRequestError';
        this.status = status;

        // Fix prototype chain when targeting ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
    public isUnauthorizedError(): boolean {
        return this.status === 401;
    }
}

const throwFailureReason = async (r: Response): Promise<never> => {
    const reason = await r.text();
    throw new ApiError(r.status, reason);
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

let ApiBase = LocalGetServer() ?? '';
export const GetApiBase = () => ApiBase;
export const SetApiBase = (base: string) => {
    if (base.endsWith('/')) {
        base = base.substring(0, base.length - 1);
    }
    ApiBase = base;
    LocalStoreServer(base);
};

let authToken = '';
export const SetAuthToken = (base: string) => {
    authToken = base;
};

const apiFetch = (path: string, args?: RequestInit) => {
    const headers = new Headers(args?.headers);
    if (authToken) {
        headers.set('Auth-Token', authToken);
    }
    return fetch(path, {...args, headers});
};

export const HasAuth = () => {
    if (authToken) {
        return true;
    }
    return GetCookieValue('ponponpon') !== null;
};

export const IsCrossOrigin = (base: string) => {
    const apiUrl = new URL(base, window.location.origin);
    return apiUrl.origin !== window.location.origin;
};

export const ApiLogout = async (): Promise<boolean> => {
    return apiFetch(`${ApiBase}/api/logout`).then((r) => r.status === 200);
};

export const ApiWhoAmI = (): Promise<TblUser> => {
    return fetchJson(apiFetch(`${ApiBase}/api/whoami`));
};

export const ApiGetUserFoods = (): Promise<TblUserFood[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/foods`));
};

export const ApiGetUserEvents = (): Promise<TblUserEvent[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/events`));
};

export const ApiGetUserEventLog = (): Promise<TblUserEventLog[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/eventlogs`));
};

export const ApiGetUserEventFoodLog = (n = -1): Promise<UserEventFoodLog[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/eventfoodlogs?n=${n}`));
};

export const ApiGetUserBodyLog = (): Promise<TblUserBodyLog[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/bodylog`));
};

export const ApiGetUserGoals = (): Promise<TblUserGoal[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/goals`));
};

export const ApiGetUserGoalProgress = (goal: CheckGoalProgress): Promise<UserGoalProgress> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/goal/progress`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(goal),
        })
    );
};

export const ApiGetUserTags = (): Promise<TblUserTag[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/tags`));
};

export const ApiGetUserTimespans = (): Promise<TblUserTimespan[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/timespans`));
};

export const ApiGetDataSources = (): Promise<TblDataSource[]> => {
    return fetchJson(apiFetch(`${ApiBase}/api/datasources`));
};

export const ApiGetDataSourceFoods = (dataSourceID: number, search: string): Promise<TblDataSourceFood[]> => {
    const encodedSearch = encodeURIComponent(search);
    return fetchJson(apiFetch(`${ApiBase}/api/datasources/${dataSourceID}/${encodedSearch}`));
};

export const ApiUpdateUser = (user: TblUpdateUser): Promise<TblUser> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/user/update`, {
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
        apiFetch(`${ApiBase}/api/food/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};

export const ApiNewUserFood = (food: TblUserFood): Promise<TblUserFood> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/food/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};

export const ApiNewUserBodyLog = (log: TblUserBodyLog): Promise<TblUserBodyLog> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/bodylog/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(log),
        })
    );
};

export const ApiNewUserGoal = (goal: TblUserGoal): Promise<TblUserGoal> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/goal/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(goal),
        })
    );
};
export const ApiNewUserTag = (tag: TblUserTag): Promise<TblUserTag> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/tag/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(tag),
        })
    );
};

export const ApiNewUserTimespan = (tag: TblUserTimespan): Promise<TblUserTimespan> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/timespan/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(tag),
        })
    );
};

export const ApiUpdateUserTimespan = (tag: TblUserTimespan): Promise<void> => {
    return fetchNone(
        apiFetch(`${ApiBase}/api/timespan/update`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(tag),
        })
    );
};

export const ApiDeleteUserGoal = (goal: TblUserGoal): Promise<void> => {
    return fetchNone(
        apiFetch(`${ApiBase}/api/goal/delete`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(goal),
        })
    );
};

export const ApiDeleteUserBodyLog = (log: TblUserBodyLog): Promise<void> => {
    return fetchNone(
        apiFetch(`${ApiBase}/api/bodylog/delete`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(log),
        })
    );
};

export const ApiDeleteUserFood = (food: TblUserFood): Promise<void> => {
    return fetchNone(
        apiFetch(`${ApiBase}/api/food/delete`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};

export const ApiUpdateUserEventLog = (eventlog: UpdateUserEventLog): Promise<UserEventFoodLog> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/eventfoodlog/update`, {
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
        apiFetch(`${ApiBase}/api/eventlog/delete`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(eventlog),
        })
    );
};

export const ApiNewEventLog = (food: CreateUserEventLog): Promise<UserEventFoodLog> => {
    return fetchJson(
        apiFetch(`${ApiBase}/api/eventlog/new`, {
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(food),
        })
    );
};
