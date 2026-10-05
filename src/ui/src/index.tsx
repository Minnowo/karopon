/* eslint-disable complexity */
if (import.meta.env.MODE === 'development') {
    import('preact/debug');
}

import './styles.css';

import {render} from 'preact';

import {Header} from './components/header.jsx';
import {LoginDialog, LoginPage} from './pages/login_page.jsx';
import {FoodPage} from './pages/foodpage';
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
import {EventsPage} from './pages/eventpage';
import {SettingsPage} from './pages/settings_page.js';
import {
    LocalGetBodyLogs,
    LocalGetBodyMetrics,
    LocalGetDashboards,
    LocalGetDataSources,
    LocalGetEventLogs,
    LocalGetEvents,
    LocalGetFoods,
    LocalGetGoals,
    LocalGetNamespaces,
    LocalGetTimespans,
    LocalGetUser,
    LocalStoreBodyLogs,
    LocalStoreBodyMetrics,
    LocalStoreDashboards,
    LocalStoreTagColors,
    LocalGetTagColors,
    LocalStoreDataSources,
    LocalStoreEventLogs,
    LocalStoreEvents,
    LocalStoreFoods,
    LocalStoreGoals,
    LocalStoreNamespaces,
    LocalStoreTimespans,
    LocalStoreUser,
    LocalGetActivities,
    LocalStoreActivities,
    LocalGetReminders,
    LocalStoreReminders,
} from './utils/localstate';
import {ErrorDiv, ErrorDivMsg} from './components/error_div';
import {BodyPage} from './pages/bodypage';
import {GoalsPage} from './pages/goalspage';
import {TagsPage} from './pages/tagspage';
import {BodyMetricsPage} from './pages/bodymetricspage';
import {TimespansPage} from './pages/timepage';
import {DataExportPage} from './pages/exportpage';
import {SessionsPage} from './pages/sessions_page';
import {ActivityPage} from './pages/activitypage';
import {WorkoutPage} from './pages/workoutpage';
import {ReminderPromptPanel} from './pages/activitypage/reminder_prompt_panel';
import {useSyncNativeAlarms} from './pages/activitypage/native_alarm_bridge';
import {SyncAndroidTheme} from './platform/android';
import {ErrorBoundary} from './components/error_boundary';

export const App = () => {
    // This cookie is set when there is a valid auth token cookie.
    const hasAuthCookie = HasAuth();

    const [hashRoute, setHashRoute] = useState<string>(window.location.hash);
    const [user, setUser] = useState<TblUser | null>(LocalGetUser());
    const [foods, setFoods] = useState<TblUserFood[]>(LocalGetFoods() ?? []);
    const [events, setEvents] = useState<TblUserEvent[]>(LocalGetEvents() ?? []);
    const [eventlogs, setEventLogsWithFoodlogs] = useState<UserEventFoodLog[]>(LocalGetEventLogs() ?? []);
    const [goals, setGoals] = useState<TblUserGoal[]>(LocalGetGoals() ?? []);
    const [bodylogs, setBodyLogs] = useState<UserBodyLog[]>(LocalGetBodyLogs() ?? []);
    const [bodyMetrics, setBodyMetrics] = useState<TblUserBodyMetric[]>(LocalGetBodyMetrics() ?? []);
    const [namespaces, setNamespaces] = useState<string[]>(LocalGetNamespaces() ?? []);
    const [timespans, setTimespans] = useState<TaggedTimespan[]>(LocalGetTimespans() ?? []);
    const [dashboards, setDashboards] = useState<TblUserDashboard[]>(LocalGetDashboards() ?? []);
    const [tagColors, setTagColors] = useState<TblUserTagColor[]>(LocalGetTagColors() ?? []);
    const [activities, setActivities] = useState<ActivityWithTag[]>(LocalGetActivities() ?? []);
    const [reminders, setReminders] = useState<ReminderWithActivities[]>(LocalGetReminders() ?? []);
    const [dataSources, setDataSources] = useState<TblDataSource[]>(LocalGetDataSources() ?? []);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [refresh, setRefresh] = useState<number>(0);
    const doRefresh = useCallback(() => setRefresh((x) => x + 1), []);

    useSyncNativeAlarms(reminders);

    useLayoutEffect(() => {
        const updateFunc = () => setHashRoute(window.location.hash);

        updateFunc();
        window.addEventListener('hashchange', updateFunc);

        return () => window.removeEventListener('hashchange', updateFunc);
    }, []);

    useLayoutEffect(() => {
        if (user !== null) {
            LocalStoreUser(user);
        }
    }, [user]);

    useLayoutEffect(() => {
        if (foods !== null) {
            LocalStoreFoods(foods);
        }
    }, [foods]);

    useLayoutEffect(() => {
        if (events !== null) {
            LocalStoreEvents(events);
        }
    }, [events]);

    useLayoutEffect(() => {
        if (eventlogs !== null) {
            LocalStoreEventLogs(eventlogs);
        }
    }, [eventlogs]);

    useLayoutEffect(() => {
        if (goals !== null) {
            LocalStoreGoals(goals);
        }
    }, [goals]);

    useLayoutEffect(() => {
        if (bodylogs !== null) {
            LocalStoreBodyLogs(bodylogs);
        }
    }, [bodylogs]);

    useLayoutEffect(() => {
        if (bodyMetrics !== null) {
            LocalStoreBodyMetrics(bodyMetrics);
        }
    }, [bodyMetrics]);

    useLayoutEffect(() => {
        if (namespaces !== null) {
            LocalStoreNamespaces(namespaces);
        }
    }, [namespaces]);

    useLayoutEffect(() => {
        if (timespans !== null) {
            LocalStoreTimespans(timespans);
        }
    }, [timespans]);

    useLayoutEffect(() => {
        if (dashboards !== null) {
            LocalStoreDashboards(dashboards);
        }
    }, [dashboards]);

    useLayoutEffect(() => {
        if (tagColors !== null) {
            LocalStoreTagColors(tagColors);
        }
    }, [tagColors]);

    useLayoutEffect(() => {
        if (activities !== null) {
            LocalStoreActivities(activities);
        }
    }, [activities]);

    useLayoutEffect(() => {
        if (reminders !== null) {
            LocalStoreReminders(reminders);
        }
    }, [reminders]);

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
        if (dataSources !== null) {
            LocalStoreDataSources(dataSources);
        }
    }, [dataSources]);

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
            .catch(setErrorMsg);
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

    if (user === null) {
        return <LoginPage error={errorMsg} setErrorMsg={setErrorMsg} doRefresh={doRefresh} />;
    }

    return (
        <main className="pt-12 pb-16 px-4 sm:px-8 md:px-16">
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

            <Header user={user} />

            <div className="m-auto md:max-w-[800px]">
                {(() => {
                    switch (hashRoute) {
                        case '#logout':
                            return <LogoutPage />;
                        default:
                        case '#events':
                            return (
                                <EventsPage
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
                        case '#foods':
                            return (
                                <FoodPage
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
                        case '#workout':
                            return (
                                <WorkoutPage
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
                            return (
                                <SessionsPage
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
    );
};

render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>,
    document.getElementById('app')
);
