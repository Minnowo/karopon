/* eslint-disable complexity */
if (import.meta.env.MODE === 'development') {
    import('preact/debug');
}

import './styles.css';

import {render} from 'preact';

import {Navigation, PageTitle} from './components/navigation';
import {LoginDialog, LoginPage} from './pages/login_page.jsx';
import {StatsPage} from './pages/statspage';

import {useCallback, useEffect, useLayoutEffect, useState} from 'preact/hooks';
import {UnlockAudioContext} from './utils/sound';
import {
    TblUser,
    TblUserFood,
    TblUserEvent,
    UserEventFoodLog,
    UserBodyLog,
    TblUserBodyMetric,
    TblDataSource,
    TblUserGoal,
    TaggedTimespan,
    TblUserDashboard,
    TblUserTagColor,
    ActivityWithTag,
    ReminderWithActivities,
} from './api/types';
import {
    ApiGetUserFoods,
    ApiGetUserEvents,
    ApiGetUserEventFoodLog,
    ApiWhoAmI,
    HasAuth,
    ApiGetUserBodyLog,
    ApiGetUserBodyMetrics,
    ApiGetDataSources,
    ApiGetUserGoals,
    ApiGetUserTimespans,
    ApiGetUserNamespaces,
    ApiGetDashboards,
    ApiGetUserTagColors,
    ApiGetUserActivities,
    ApiGetUserReminders,
} from './api/api';
import {LogoutPage} from './pages/logout_page.js';
import {FOOD_LOG_ROUTE, FOOD_LIBRARY_ROUTE, FoodAreaPage, OLD_FOOD_ROUTES} from './pages/foodareapage';
import {SettingsPage} from './pages/settings_page.js';
import {LocalDropOldDataCache} from './utils/localstate';
import {ErrorDiv, ErrorDivMsg} from './components/error_div';
import {BodyPage} from './pages/bodypage';
import {GoalsPage} from './pages/goalspage';
import {TagsPage} from './pages/tagspage';
import {BodyMetricsPage} from './pages/bodymetricspage';
import {TimespansPage} from './pages/timepage';
import {DataExportPage} from './pages/exportpage';
import {SessionsPage} from './pages/sessions_page';
import {ActivityPage} from './pages/activitypage';
import {WORKOUT_EXERCISES_ROUTE, WORKOUT_HISTORY_ROUTE, WORKOUT_ROUTE, WorkoutPage} from './pages/workoutpage';
import {ReminderPromptPanel} from './pages/activitypage/reminder_prompt_panel';
import {useSyncNativeAlarms} from './pages/activitypage/native_alarm_bridge';
import {SyncAndroidTheme} from './platform/android';
import {ErrorBoundary} from './components/error_boundary';

export const App = () => {
    // This cookie is set when there is a valid auth token cookie.
    const hasAuthCookie = HasAuth();

    const [hashRoute, setHashRoute] = useState<string>(window.location.hash);
    const [user, setUser] = useState<TblUser | null>(null);
    // False until the server has answered whether there is a session, so a
    // reload shows "Loading" rather than the login page.
    const [sessionChecked, setSessionChecked] = useState<boolean>(false);
    const [foods, setFoods] = useState<TblUserFood[]>([]);
    const [events, setEvents] = useState<TblUserEvent[]>([]);
    const [eventlogs, setEventLogsWithFoodlogs] = useState<UserEventFoodLog[]>([]);
    const [goals, setGoals] = useState<TblUserGoal[]>([]);
    const [bodylogs, setBodyLogs] = useState<UserBodyLog[]>([]);
    const [bodyMetrics, setBodyMetrics] = useState<TblUserBodyMetric[]>([]);
    const [namespaces, setNamespaces] = useState<string[]>([]);
    const [timespans, setTimespans] = useState<TaggedTimespan[]>([]);
    const [dashboards, setDashboards] = useState<TblUserDashboard[]>([]);
    const [tagColors, setTagColors] = useState<TblUserTagColor[]>([]);
    const [activities, setActivities] = useState<ActivityWithTag[]>([]);
    const [reminders, setReminders] = useState<ReminderWithActivities[]>([]);
    const [dataSources, setDataSources] = useState<TblDataSource[]>([]);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [refresh, setRefresh] = useState<number>(0);
    const doRefresh = useCallback(() => setRefresh((x) => x + 1), []);

    useSyncNativeAlarms(reminders);

    useEffect(LocalDropOldDataCache, []);

    useLayoutEffect(() => {
        const updateFunc = () => {
            const moved = OLD_FOOD_ROUTES[window.location.hash];
            if (moved !== undefined) {
                // Replace, not push, so Back does not return to the old route.
                window.history.replaceState(null, '', moved);
            }
            setHashRoute(window.location.hash);
        };

        updateFunc();
        window.addEventListener('hashchange', updateFunc);

        return () => window.removeEventListener('hashchange', updateFunc);
    }, []);

    useEffect(() => {
        // request proper permissions for notification / web audio api in advance, if we actually need it.

        let alertEnabled = false;
        let audioNeeded = false;
        for (const r of reminders) {
            if (r.reminder.enabled) {
                alertEnabled = true;
                if (r.reminder.sound !== 'none' && r.reminder.sound !== '') {
                    audioNeeded = true;
                    break;
                }
            }
        }

        if (!alertEnabled) {
            return;
        }

        const unlockAudio = () => {
            try {
                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            } catch {
                // ignore
            }

            if (audioNeeded) {
                UnlockAudioContext();
            }
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('pointerdown', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        return () => {
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, [reminders]);

    useLayoutEffect(() => {
        ApiWhoAmI()
            .then((me) => {
                setUser(me);

                const requests = [
                    ApiGetUserFoods().then(setFoods),
                    ApiGetUserEvents().then(setEvents),
                    ApiGetUserEventFoodLog(me.event_history_fetch_limit).then(setEventLogsWithFoodlogs),
                    ApiGetUserBodyLog().then(setBodyLogs),
                    ApiGetUserBodyMetrics().then(setBodyMetrics),
                    ApiGetDataSources().then(setDataSources),
                    ApiGetUserGoals().then(setGoals),
                    ApiGetUserNamespaces().then(setNamespaces),
                    ApiGetUserTimespans(me.timespan_history_fetch_limit).then(setTimespans),
                    ApiGetDashboards().then(setDashboards),
                    ApiGetUserTagColors().then(setTagColors),
                    ApiGetUserActivities().then(setActivities),
                    ApiGetUserReminders().then(setReminders),
                ];

                Promise.allSettled(requests).then((results) => {
                    const errors = results
                        .filter((r) => r.status === 'rejected')
                        .map((r: PromiseRejectedResult) => {
                            if (r.reason instanceof Error) {
                                return r.reason;
                            }
                            return new Error(`${r.reason}`);
                        });

                    if (errors.length > 0) {
                        setErrorMsg(errors);
                    } else {
                        setErrorMsg(null);
                    }
                });
            })
            .catch(setErrorMsg)
            .finally(() => setSessionChecked(true));
    }, [refresh]);

    useLayoutEffect(() => {
        if (!user || !user.theme) {
            document.documentElement.dataset.theme = 'dark';
        } else {
            document.documentElement.dataset.theme = user.theme;
        }
    }, [user]);

    // ?nocss skips the custom CSS so a broken stylesheet can still be fixed from the settings page.
    useLayoutEffect(() => {
        const css = new URLSearchParams(window.location.search).has('nocss') ? '' : (user?.custom_css ?? '');
        let el = document.getElementById('user-custom-css');
        if (css === '') {
            el?.remove();
            return;
        }
        if (!el) {
            el = document.createElement('style');
            el.id = 'user-custom-css';
            document.head.appendChild(el);
        }
        el.textContent = css;
    }, [user?.custom_css]);

    // After the two effects above, so it reads the final colors.
    useLayoutEffect(SyncAndroidTheme, [user?.theme, user?.custom_css]);

    useEffect(() => {
        document.title = user === null ? 'Log in - Karopon' : PageTitle(hashRoute);
    }, [hashRoute, user]);

    if (user === null && !sessionChecked) {
        return (
            <main className="pt-32 text-center">
                <p role="status">Loading...</p>
            </main>
        );
    }

    if (user === null) {
        return <LoginPage error={errorMsg} setErrorMsg={setErrorMsg} doRefresh={doRefresh} />;
    }

    return (
        <>
            {/* The routes are hash links, so the skip link moves focus itself instead of changing the hash. */}
            <a
                className="skip-link"
                href="#main-content"
                onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('main-content')?.focus();
                }}
            >
                Skip to content
            </a>

            {/* On wide windows the rail and the page sit side by side, centered as one group.
                The page keeps sm:px-8 there (32px from the rail); its max width is 800 + 2 * 32. */}
            <div className="expanded:flex expanded:justify-center">
                <Navigation user={user} route={hashRoute} />

                <main
                    id="main-content"
                    tabIndex={-1}
                    className="pt-12 pb-28 px-4 sm:px-8 md:max-expanded:px-16 expanded:pb-16 expanded:min-w-0 expanded:max-w-[864px] expanded:flex-1"
                >
                    <>
                        {/* need this inside a component to prevent a remount of the router when this changes */}
                        {hasAuthCookie ? (
                            <ErrorDiv errorMsg={errorMsg} />
                        ) : (
                            <div className="flex flex-col justify-center items-center py-4 mb-4">
                                <LoginDialog error={errorMsg} setErrorMsg={setErrorMsg} doRefresh={doRefresh} />
                                <strong>Your session has expired, please login again.</strong>
                            </div>
                        )}
                    </>

                    <ReminderPromptPanel
                        user={user}
                        setUser={setUser}
                        foods={foods}
                        setFoods={setFoods}
                        events={events}
                        setEvents={setEvents}
                        eventlogs={eventlogs}
                        setEventLogs={setEventLogsWithFoodlogs}
                        goals={goals}
                        setGoals={setGoals}
                        bodylogs={bodylogs}
                        bodyMetrics={bodyMetrics}
                        dataSources={dataSources}
                        setBodyLogs={setBodyLogs}
                        setBodyMetrics={setBodyMetrics}
                        namespaces={namespaces}
                        setNamespaces={setNamespaces}
                        timespans={timespans}
                        setTimespans={setTimespans}
                        dashboards={dashboards}
                        setDashboards={setDashboards}
                        tagColors={tagColors}
                        setTagColors={setTagColors}
                        activities={activities}
                        setActivities={setActivities}
                        reminders={reminders}
                        setReminders={setReminders}
                        setErrorMsg={setErrorMsg}
                        doRefresh={doRefresh}
                    />

                    <div className="m-auto md:max-w-[800px]">
                        {(() => {
                            switch (hashRoute) {
                                case '#logout':
                                    return <LogoutPage />;
                                default:
                                case FOOD_LOG_ROUTE:
                                case FOOD_LIBRARY_ROUTE:
                                    return (
                                        <FoodAreaPage
                                            route={hashRoute}
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            goals={goals}
                                            setGoals={setGoals}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            dataSources={dataSources}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#body':
                                    return (
                                        <BodyPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#goals':
                                    return (
                                        <GoalsPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#stats':
                                    return (
                                        <StatsPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#activity':
                                    return (
                                        <ActivityPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case WORKOUT_ROUTE:
                                case WORKOUT_EXERCISES_ROUTE:
                                case WORKOUT_HISTORY_ROUTE:
                                    return (
                                        <WorkoutPage
                                            route={hashRoute}
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#tags':
                                    return (
                                        <TagsPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#body-metrics':
                                    return (
                                        <BodyMetricsPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#time':
                                    return (
                                        <TimespansPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#data-export':
                                    return (
                                        <DataExportPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            goals={goals}
                                            setGoals={setGoals}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            dataSources={dataSources}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                                case '#sessions':
                                    return <SessionsPage />;
                                case '#settings':
                                    return (
                                        <SettingsPage
                                            user={user}
                                            setUser={setUser}
                                            foods={foods}
                                            setFoods={setFoods}
                                            events={events}
                                            setEvents={setEvents}
                                            eventlogs={eventlogs}
                                            setEventLogs={setEventLogsWithFoodlogs}
                                            goals={goals}
                                            setGoals={setGoals}
                                            bodylogs={bodylogs}
                                            bodyMetrics={bodyMetrics}
                                            dataSources={dataSources}
                                            setBodyLogs={setBodyLogs}
                                            setBodyMetrics={setBodyMetrics}
                                            namespaces={namespaces}
                                            setNamespaces={setNamespaces}
                                            timespans={timespans}
                                            setTimespans={setTimespans}
                                            dashboards={dashboards}
                                            setDashboards={setDashboards}
                                            tagColors={tagColors}
                                            setTagColors={setTagColors}
                                            activities={activities}
                                            setActivities={setActivities}
                                            reminders={reminders}
                                            setReminders={setReminders}
                                            setErrorMsg={setErrorMsg}
                                            doRefresh={doRefresh}
                                        />
                                    );
                            }
                        })()}
                    </div>
                </main>
            </div>
        </>
    );
};

const appRoot = document.getElementById('app');
if (appRoot === null) {
    throw new Error('index.html has no #app element to render into');
}

render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>,
    appRoot
);
