import {GetCookieValue} from '../utils/cookies';
import {LocalGetServer, LocalGetServerToken, LocalStoreServer, LocalStoreServerToken} from '../utils/localstate';
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
    TaggedTimespan,
    UserSession,
    TblUserDashboard,
    TblUserTagColor,
} from './types';

export class ApiError extends Error {
    public readonly status: number;
    public readonly url: string;
    public readonly method: string;

    constructor(status: number, statusText: string, url: string, method: string) {
        const message = `[${method}] [${status}] [${url}] ${statusText.trim()}`;

        super(message);

        this.name = 'HttpRequestError';
        this.status = status;
        this.url = url;
        this.method = method;

        Object.setPrototypeOf(this, new.target.prototype);
    }

    public isUnauthorizedError(): boolean {
        return this.status === 401;
    }
}

let ApiBase = LocalGetServer() ?? '';
export const GetApiBase = () => ApiBase;
export const SetApiBase = (base: string) => {
    if (base.endsWith('/')) {
        base = base.substring(0, base.length - 1);
    }
    ApiBase = base;
    LocalStoreServer(base);
};

let authToken = LocalGetServerToken() ?? '';
export const GetAuthToken = () => authToken;
export const SetAuthToken = (base: string) => {
    authToken = base;
    LocalStoreServerToken(base);
};

const apiFetch = (path: string, args?: RequestInit) => {
    const headers = new Headers(args?.headers);
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    }
    return fetch(path, {...args, headers});
};

const throwFailureReason = async (r: Response, path: string, args?: RequestInit): Promise<never> => {
    const reason = await r.text();
    throw new ApiError(r.status, reason, path, args?.method ?? 'GET');
};

const fetchNone = async (path: string, args?: RequestInit): Promise<void> => {
    const response = await apiFetch(path, args);

    if (response.status !== 200) {
        await throwFailureReason(response, path, args);
    }
};

const fetchJson = async <T>(path: string, args?: RequestInit): Promise<T> => {
    const response = await apiFetch(path, args);

    if (response.status !== 200) {
        await throwFailureReason(response, path, args);
    }

    return (await response.json()) as T;
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
    return fetchJson(`${ApiBase}/api/whoami`);
};

export const ApiGetUserFoods = (): Promise<TblUserFood[]> => {
    return fetchJson(`${ApiBase}/api/foods`);
};

export const ApiGetUserEvents = (): Promise<TblUserEvent[]> => {
    return fetchJson(`${ApiBase}/api/events`);
};

export const ApiGetUserEventLog = (): Promise<TblUserEventLog[]> => {
    return fetchJson(`${ApiBase}/api/eventlogs`);
};

export const ApiGetUserEventFoodLog = (n = -1): Promise<UserEventFoodLog[]> => {
    return fetchJson(`${ApiBase}/api/eventfoodlogs?n=${n}`);
};

export const ApiGetUserBodyLog = (): Promise<TblUserBodyLog[]> => {
    return fetchJson(`${ApiBase}/api/bodylog`);
};

export const ApiGetUserGoals = (): Promise<TblUserGoal[]> => {
    return fetchJson(`${ApiBase}/api/goals`);
};

export const ApiGetUserGoalProgress = (goal: CheckGoalProgress): Promise<UserGoalProgress> => {
    return fetchJson(`${ApiBase}/api/goal/progress`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(goal),
    });
};

export const ApiGetUserTags = (): Promise<TblUserTag[]> => {
    return fetchJson(`${ApiBase}/api/tags`);
};

export const ApiGetUserNamespaces = (): Promise<string[]> => {
    return fetchJson(`${ApiBase}/api/tags/namespaces`);
};

export const ApiGetUserNamespacesTags = (namespace: string, search: string): Promise<TblUserTag[]> => {
    const encodedNamespace = encodeURIComponent(namespace);
    const encodedSearch = encodeURIComponent(search);
    return fetchJson(`${ApiBase}/api/tags/search?namespace=${encodedNamespace}&s=${encodedSearch}&limit=30`);
};

export const ApiGetUserTimespans = (): Promise<TaggedTimespan[]> => {
    return fetchJson(`${ApiBase}/api/timespans/tagged`);
};

export const ApiGetDataSources = (): Promise<TblDataSource[]> => {
    return fetchJson(`${ApiBase}/api/datasources`);
};

export const ApiGetDataSourceFoods = (dataSourceID: number, search: string): Promise<TblDataSourceFood[]> => {
    const encodedSearch = encodeURIComponent(search);
    return fetchJson(`${ApiBase}/api/datasources/${dataSourceID}/${encodedSearch}`);
};

export const ApiUploadEventPhoto = (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('photo', file);
    return fetchNone(`${ApiBase}/api/eventlogphoto/new`, {
        method: 'POST',
        body: formData,
    });
};

export const ApiUpdateUser = (user: TblUpdateUser): Promise<TblUser> => {
    return fetchJson(`${ApiBase}/api/user/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(user),
    });
};

export const ApiUpdateUserFood = (food: TblUserFood): Promise<void> => {
    return fetchNone(`${ApiBase}/api/food/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(food),
    });
};

export const ApiUpdateUserTimespanTags = (ts: TaggedTimespan): Promise<void> => {
    return fetchNone(`${ApiBase}/api/timespan/update/tags`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(ts),
    });
};

export const ApiNewUserFood = (food: TblUserFood): Promise<TblUserFood> => {
    return fetchJson(`${ApiBase}/api/food/new`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(food),
    });
};

export const ApiNewUserBodyLog = (log: TblUserBodyLog): Promise<TblUserBodyLog> => {
    return fetchJson(`${ApiBase}/api/bodylog/new`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(log),
    });
};

export const ApiNewUserGoal = (goal: TblUserGoal): Promise<TblUserGoal> => {
    return fetchJson(`${ApiBase}/api/goal/new`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(goal),
    });
};
export const ApiUpdateUserGoal = (goal: TblUserGoal): Promise<TblUserGoal> => {
    return fetchJson(`${ApiBase}/api/goal/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(goal),
    });
};
export const ApiNewUserTag = (tag: TblUserTag): Promise<TblUserTag> => {
    return fetchJson(`${ApiBase}/api/tag/new`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(tag),
    });
};

export const ApiDeleteUserTag = (tag: TblUserTag): Promise<void> => {
    return fetchNone(`${ApiBase}/api/tag/delete`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(tag),
    });
};

export const ApiUpdateUserTag = (tag: TblUserTag, newNamespace: string, newName: string): Promise<void> => {
    return fetchNone(`${ApiBase}/api/tag/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
            namespace: tag.namespace,
            name: tag.name,
            new_namespace: newNamespace,
            new_name: newName,
        }),
    });
};

export const ApiNewUserTimespan = (tag: TaggedTimespan): Promise<TaggedTimespan> => {
    return fetchJson(`${ApiBase}/api/timespan/new`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(tag),
    });
};

export const ApiUpdateUserTimespan = (tag: TblUserTimespan): Promise<void> => {
    return fetchNone(`${ApiBase}/api/timespan/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(tag),
    });
};

export const ApiDeleteUserGoal = (goal: TblUserGoal): Promise<void> => {
    return fetchNone(`${ApiBase}/api/goal/delete`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(goal),
    });
};

export const ApiUpdateUserBodyLog = (log: TblUserBodyLog): Promise<TblUserBodyLog> => {
    return fetchJson(`${ApiBase}/api/bodylog/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(log),
    });
};

export const ApiDeleteUserBodyLog = (log: TblUserBodyLog): Promise<void> => {
    return fetchNone(`${ApiBase}/api/bodylog/delete`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(log),
    });
};

export const ApiDeleteUserFood = (food: TblUserFood): Promise<void> => {
    return fetchNone(`${ApiBase}/api/food/delete`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(food),
    });
};

export const ApiDeleteUserTimespan = (ts: TblUserTimespan): Promise<void> => {
    return fetchNone(`${ApiBase}/api/timespan/delete`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(ts),
    });
};

export const ApiUpdateUserEventLog = (eventlog: UpdateUserEventLog): Promise<UserEventFoodLog> => {
    return fetchJson(`${ApiBase}/api/eventfoodlog/update`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(eventlog),
    });
};

export const ApiDeleteUserEventLog = (eventlog: TblUserEventLog): Promise<void> => {
    return fetchNone(`${ApiBase}/api/eventlog/delete`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(eventlog),
    });
};

export const ApiGetUserSessions = (): Promise<UserSession[]> => {
    return fetchJson(`${ApiBase}/api/sessions`);
};

export const ApiDeleteUserSession = (session: UserSession): Promise<void> => {
    return fetchNone(`${ApiBase}/api/session/delete`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify({token_id: session.token_id}),
    });
};

export const ApiUpdateUserSession = (session: UserSession, userAgent: string): Promise<void> => {
    return fetchNone(`${ApiBase}/api/session/update`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify({token_id: session.token_id, user_agent: userAgent}),
    });
};

export const ApiGetDashboards = (): Promise<TblUserDashboard[]> => {
    return fetchJson(`${ApiBase}/api/dashboards`);
};

export const ApiNewDashboard = (name: string, data: string): Promise<TblUserDashboard> => {
    return fetchJson(`${ApiBase}/api/dashboard/new`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify({name, data}),
    });
};

export const ApiUpdateDashboard = (id: number, name: string, data: string): Promise<void> => {
    return fetchNone(`${ApiBase}/api/dashboard/update`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify({id, name, data}),
    });
};

export const ApiDeleteDashboard = (id: number): Promise<void> => {
    return fetchNone(`${ApiBase}/api/dashboard/delete`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify({id}),
    });
};

export const ApiGetUserTagColors = (): Promise<TblUserTagColor[]> => fetchJson(`${ApiBase}/api/tag/colors`);

export const ApiSetUserTagColors = (colors: TblUserTagColor[]): Promise<void> =>
    fetchNone(`${ApiBase}/api/tag/color/set`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify(colors),
    });

export const ApiDeleteUserTagColors = (namespace: string[]): Promise<void> =>
    fetchNone(`${ApiBase}/api/tag/color/delete`, {
        headers: {'content-type': 'application/json'},
        method: 'POST',
        body: JSON.stringify({namespace}),
    });

export const ApiNewEventLog = (food: CreateUserEventLog): Promise<UserEventFoodLog> => {
    return fetchJson(`${ApiBase}/api/eventlog/new`, {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(food),
    });
};
