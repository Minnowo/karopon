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

import {useCallback, useLayoutEffect, useState} from 'preact/hooks';
import {
    TblUser,
    TblUserFood,
    TblUserEvent,
    UserEventFoodLog,
    TblUserBodyLog,
    TblDataSource,
    TblUserGoal,
    TaggedTimespan,
    TblUserDashboard,
    TblUserTagColor,
} from './api/types';
import {
    ApiGetUserFoods,
    ApiGetUserEvents,
    ApiGetUserEventFoodLog,
    ApiWhoAmI,
    HasAuth,
    ApiGetUserBodyLog,
    ApiGetDataSources,
    ApiGetUserGoals,
    ApiGetUserTimespans,
    ApiGetUserNamespaces,
    ApiGetDashboards,
    ApiGetUserTagColors,
} from './api/api';
import {LogoutPage} from './pages/logout_page.js';
import {EventsPage} from './pages/eventpage';
import {SettingsPage} from './pages/settings_page.js';
import {
    LocalGetBodyLogs,
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
} from './utils/localstate';
import {ErrorDiv, ErrorDivMsg} from './components/error_div';
import {BodyPage} from './pages/bodypage';
import {GoalsPage} from './pages/goalspage';
import {TagsPage} from './pages/tagspage';
import {TimespansPage} from './pages/timepage';
import {DataExportPage} from './pages/exportpage';
import {SessionsPage} from './pages/sessions_page';

export const App = () => {
    // This cookie is set when there is a valid auth token cookie.
    const hasAuthCookie = HasAuth();

    const [hashRoute, setHashRoute] = useState<string>(window.location.hash);
    const [user, setUser] = useState<TblUser | null>(LocalGetUser());
    const [foods, setFoods] = useState<TblUserFood[]>(LocalGetFoods() ?? []);
    const [events, setEvents] = useState<TblUserEvent[]>(LocalGetEvents() ?? []);
    const [eventlogs, setEventLogsWithFoodlogs] = useState<UserEventFoodLog[]>(LocalGetEventLogs() ?? []);
    const [goals, setGoals] = useState<TblUserGoal[]>(LocalGetGoals() ?? []);
    const [bodylogs, setBodyLogs] = useState<TblUserBodyLog[]>(LocalGetBodyLogs() ?? []);
    const [namespaces, setNamespaces] = useState<string[]>(LocalGetNamespaces() ?? []);
    const [timespans, setTimespans] = useState<TaggedTimespan[]>(LocalGetTimespans() ?? []);
    const [dashboards, setDashboards] = useState<TblUserDashboard[]>(LocalGetDashboards() ?? []);
    const [tagColors, setTagColors] = useState<TblUserTagColor[]>(LocalGetTagColors() ?? []);
    const [dataSources, setDataSources] = useState<TblDataSource[]>(LocalGetDataSources() ?? []);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [refresh, setRefresh] = useState<number>(0);
    const doRefresh = useCallback(() => setRefresh((x) => x + 1), []);

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
                    ApiGetDataSources().then(setDataSources),
                    ApiGetUserGoals().then(setGoals),
                    ApiGetUserNamespaces().then(setNamespaces),
                    ApiGetUserTimespans().then(setTimespans),
                    ApiGetDashboards().then(setDashboards),
                    ApiGetUserTagColors().then(setTagColors),
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
                        <span className="font-bold">Your session has expired, please login again.</span>
                    </div>
                )}
            </>

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
                                    setBodyLogs={setBodyLogs}
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
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    setBodyLogs={setBodyLogs}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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
                                    dataSources={dataSources}
                                    setBodyLogs={setBodyLogs}
                                    namespaces={namespaces}
                                    setNamespaces={setNamespaces}
                                    timespans={timespans}
                                    setTimespans={setTimespans}
                                    dashboards={dashboards}
                                    setDashboards={setDashboards}
                                    tagColors={tagColors}
                                    setTagColors={setTagColors}
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

render(<App />, document.getElementById('app'));
