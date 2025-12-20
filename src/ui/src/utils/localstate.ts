import type {TblUser, TblUserFood, TblUserEvent, UserEventFoodLog, TblUserBodyLog} from '../api/types';

const LOCAL_STORAGE_KEY_USER = 'user';
const LOCAL_STORAGE_KEY_EVENTS = 'events';
const LOCAL_STORAGE_KEY_FOODS = 'foods';
const LOCAL_STORAGE_KEY_EVENTLOGS = 'eventlogs';
const LOCAL_STORAGE_KEY_BODYLOGS = 'bodylogs';

const store = (key: string, obj: string) => {
    try {
        localStorage.setItem(key, obj);
    } catch (err) {
        console.warn('Failed to save app state', err);
    }
};
const load = <T>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            return JSON.parse(raw) as T;
        }
    } catch (err) {
        console.warn('Failed to load app state', err);
    }
    return null;
};
export const LocalStoreUser = (user: TblUser) => {
    store(LOCAL_STORAGE_KEY_USER, JSON.stringify(user));
};
export const LocalStoreEvents = (events: TblUserEvent[]) => {
    store(LOCAL_STORAGE_KEY_EVENTS, JSON.stringify(events));
};
export const LocalStoreFoods = (foods: TblUserFood[]) => {
    store(LOCAL_STORAGE_KEY_FOODS, JSON.stringify(foods));
};
export const LocalStoreEventLogs = (logs: UserEventFoodLog[]) => {
    store(LOCAL_STORAGE_KEY_EVENTLOGS, JSON.stringify(logs));
};
export const LocalStoreBodyLogs = (logs: TblUserBodyLog[]) => {
    store(LOCAL_STORAGE_KEY_BODYLOGS, JSON.stringify(logs));
};

export const LocalGetUser = () => load<TblUser>(LOCAL_STORAGE_KEY_USER);
export const LocalGetEvents = () => load<TblUserEvent[]>(LOCAL_STORAGE_KEY_EVENTS);
export const LocalGetFoods = () => load<TblUserFood[]>(LOCAL_STORAGE_KEY_FOODS);
export const LocalGetEventLogs = () => load<UserEventFoodLog[]>(LOCAL_STORAGE_KEY_EVENTLOGS);
export const LocalGetBodyLogs = () => load<TblUserBodyLog[]>(LOCAL_STORAGE_KEY_BODYLOGS);

export const LocalClearAll = () => {
    try {
        localStorage.clear();
    } catch {}
};
