import './styles.css';

import {render} from 'preact';
import {Router, Route, Switch} from 'wouter-preact';
import {useHashLocation} from 'wouter-preact/use-hash-location';

import {Header} from './components/header.jsx';
import {LoginDialog, LoginPage} from './pages/login_page.jsx';
import {FoodPage} from './pages/foodpage';
import {BloodSugarPage} from './pages/bloodsugar_page.js';
import {StatsPage} from './pages/statspage';

import {useEffect, useState} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent, UserEventFoodLog} from './api/types';
import {ApiGetUserFoods, ApiGetUserEvents, ApiGetUserEventFoodLog, ApiWhoAmI, HasAuth} from './api/api';
import {LogoutPage} from './pages/logout_page.js';
import {EventsPage} from './pages/eventpage';
import {SettingsPage} from './pages/settings_page.js';
import {NotFound} from './pages/_404.js';
import {
    LocalGetEventlogs,
    LocalGetEvents,
    LocalGetFoods,
    LocalGetUser,
    LocalStoreEventlogs,
    LocalStoreEvents,
    LocalStoreFoods,
    LocalStoreUser,
} from './utils/localstate';
import {ErrorDiv} from './components/error_div';

export function App() {
    // This cookie is set when there is a valid auth token cookie.
    const hasAuthCookie = HasAuth();

    const [user, setUser] = useState<TblUser | null>(LocalGetUser());
    const [foods, setFoods] = useState<TblUserFood[] | null>(LocalGetFoods());
    const [events, setEvents] = useState<TblUserEvent[] | null>(LocalGetEvents());
    const [eventlogs, setEventlogsWithFoodlogs] = useState<UserEventFoodLog[] | null>(LocalGetEventlogs());
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [refresh, setRefresh] = useState<number>(0);
    const doRefresh = () => setRefresh((x) => x + 1);

    useEffect(() => {
        if (user !== null) {
            LocalStoreUser(user);
        }
    }, [user]);

    useEffect(() => {
        if (foods !== null) {
            LocalStoreFoods(foods);
        }
    }, [foods]);

    useEffect(() => {
        if (events !== null) {
            LocalStoreEvents(events);
        }
    }, [events]);

    useEffect(() => {
        if (eventlogs !== null) {
            LocalStoreEventlogs(eventlogs);
        }
    }, [eventlogs]);

    useEffect(() => {
        ApiWhoAmI()
            .then(async (me) => {
                const myFood = await ApiGetUserFoods();
                const myEvents = await ApiGetUserEvents();
                const myEventLogs = await ApiGetUserEventFoodLog(me.event_history_fetch_limit);

                myFood.sort((a, b) => a.name.localeCompare(b.name));

                setUser(me);
                setFoods(myFood);
                setEvents(myEvents);
                setEventlogsWithFoodlogs(myEventLogs);
                setErrorMsg(null);
            })
            .catch((e: Error) => setErrorMsg(e.message));
    }, [refresh]);

    useEffect(() => {
        if (user === null || user.dark_mode) {
            document.documentElement.dataset.theme = 'dark';
        } else {
            document.documentElement.dataset.theme = 'light';
        }
    }, [user]);

    if (user === null || foods === null || events === null || eventlogs === null) {
        return <LoginPage error={errorMsg} setErrorMsg={setErrorMsg} doRefresh={doRefresh} />;
    }

    return (
        <main className="p-4 sm:p-8 md:p-16">
            <Router hook={useHashLocation}>
                <Header user={user} />

                <>
                    {/* need this inside a component to prevent a remount of the router when this changes */}
                    {hasAuthCookie ? (
                        <ErrorDiv errorMsg={errorMsg} />
                    ) : (
                        <div className="flex flex-col justify-center items-center py-4">
                            <LoginDialog error={errorMsg} setErrorMsg={setErrorMsg} doRefresh={doRefresh} />
                            <span className="font-bold">Your session has expired, please login again.</span>
                        </div>
                    )}
                </>

                <div className="m-auto md:max-w-[600px] lg:max-w-[800px]">
                    <Switch>
                        <Route path="/events">
                            <EventsPage
                                user={user}
                                setUser={setUser}
                                foods={foods}
                                setFoods={setFoods}
                                events={events}
                                setEvents={setEvents}
                                eventlogs={eventlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
                                doRefresh={doRefresh}
                            />
                        </Route>
                        <Route path="/foods">
                            <FoodPage
                                user={user}
                                setUser={setUser}
                                foods={foods}
                                setFoods={setFoods}
                                events={events}
                                setEvents={setEvents}
                                eventlogs={eventlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
                                doRefresh={doRefresh}
                            />
                        </Route>
                        <Route path="/bloodsugar">
                            <BloodSugarPage
                                user={user}
                                setUser={setUser}
                                foods={foods}
                                setFoods={setFoods}
                                events={events}
                                setEvents={setEvents}
                                eventlogs={eventlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
                                doRefresh={doRefresh}
                            />
                        </Route>
                        <Route path="/stats">
                            <StatsPage
                                user={user}
                                setUser={setUser}
                                foods={foods}
                                setFoods={setFoods}
                                events={events}
                                setEvents={setEvents}
                                eventlogs={eventlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
                                doRefresh={doRefresh}
                            />
                        </Route>
                        <Route path="/logout">
                            <LogoutPage />
                        </Route>

                        <Route path="/settings">
                            <SettingsPage
                                user={user}
                                setUser={setUser}
                                foods={foods}
                                setFoods={setFoods}
                                events={events}
                                setEvents={setEvents}
                                eventlogs={eventlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
                                doRefresh={doRefresh}
                            />
                        </Route>

                        <Route>
                            <NotFound />
                        </Route>
                    </Switch>
                </div>
            </Router>
        </main>
    );
}

render(<App />, document.getElementById('app'));
