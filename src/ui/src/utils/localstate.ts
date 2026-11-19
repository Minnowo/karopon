// What the app keeps in localStorage: only state
// that has no other home. The remote server address and its token (the
// Android app's remote mode) and a workout run in progress, so a reload does
// not lose it. User data is not cached here; the app loads it from the server
// on every start.

import type {RunState} from '../pages/workoutpage/run_state';

const LOCAL_STORAGE_KEY_WORKOUT_RUN = 'workout_run';
const LOCAL_STORAGE_KEY_REMOTE = 'remote';
const LOCAL_STORAGE_KEY_REMOTE_TOKEN = 'remote_token';

// Keys of the data cache this app used to keep; removed from storage on start
// so old browsers and phones do not keep the copies.
const OLD_DATA_CACHE_KEYS = [
    'user',
    'events',
    'foods',
    'eventlogs',
    'goals',
    'bodylogs',
    'body_metrics',
    'namespaces',
    'timespans',
    'dashboards',
    'tag_colors',
    'datasources',
    'activities',
    'reminders',
];

const store = (key: string, obj: string) => {
    try {
        localStorage.setItem(key, obj);
    } catch (err) {
        console.warn('Failed to save app state', err);
    }
};
const load = <T>(key: string, loadRaw = false): T | null => {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            if (loadRaw) {
                return raw as T;
            }
            return JSON.parse(raw) as T;
        }
    } catch (err) {
        console.warn('Failed to load app state', err);
    }
    return null;
};
const remove = (keys: string[]) => {
    try {
        for (const key of keys) {
            localStorage.removeItem(key);
        }
    } catch {}
};

export const LocalStoreServerToken = (token: string) => store(LOCAL_STORAGE_KEY_REMOTE_TOKEN, token);
export const LocalStoreServer = (server: string) => store(LOCAL_STORAGE_KEY_REMOTE, server);
export const LocalGetServerToken = () => load<string>(LOCAL_STORAGE_KEY_REMOTE_TOKEN, true);
export const LocalGetServer = () => load<string>(LOCAL_STORAGE_KEY_REMOTE, true);

export const LocalStoreWorkoutRun = (run: RunState) => store(LOCAL_STORAGE_KEY_WORKOUT_RUN, JSON.stringify(run));
export const LocalGetWorkoutRun = () => load<RunState>(LOCAL_STORAGE_KEY_WORKOUT_RUN);
export const LocalClearWorkoutRun = () => remove([LOCAL_STORAGE_KEY_WORKOUT_RUN]);

// LocalDropOldDataCache removes the data cache older versions kept.
export const LocalDropOldDataCache = () => remove(OLD_DATA_CACHE_KEYS);

// LocalClearAll forgets everything tied to the signed-in user (on log out).
export const LocalClearAll = () =>
    remove([...OLD_DATA_CACHE_KEYS, LOCAL_STORAGE_KEY_WORKOUT_RUN, LOCAL_STORAGE_KEY_REMOTE_TOKEN]);
