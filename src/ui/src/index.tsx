import './styles.css';

import {render} from 'preact';
import {Router, Route, Switch} from 'wouter-preact';
import {useHashLocation} from 'wouter-preact/use-hash-location';

import {Header} from './components/header.jsx';
import {LoginPage} from './pages/login_page.jsx';
import {FoodPage} from './pages/foodpage';
import {BloodSugarPage} from './pages/bloodsugar_page.js';
import {StatsPage} from './pages/statspage';

import {useEffect, useState} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent, TblUserEventLog, UserEventFoodLog} from './api/types';
import {ApiGetUserFoods, ApiGetUserEvents, ApiGetUserEventLog, ApiGetUserEventFoodLog, ApiWhoAmI} from './api/api';
import {LogoutPage} from './pages/logout_page.js';
import {EventsPage} from './pages/eventpage';
import {SettingsPage} from './pages/settings_page.js';
import {NotFound} from './pages/_404.js';

export function App() {
    const [user, setUser] = useState<TblUser | null>(null);
    const [foods, setFoods] = useState<TblUserFood[] | null>(null);
    const [events, setEvents] = useState<TblUserEvent[] | null>(null);
    const [eventlog, setEventlog] = useState<TblUserEventLog[] | null>(null);
    const [eventlogsWithFoodlogs, setEventlogsWithFoodlogs] = useState<UserEventFoodLog[] | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [refresh, doRefresh] = useState<number>(0);

    useEffect(() => {
        ApiWhoAmI().then((me) => {
            ApiGetUserFoods().then((myFood) => {
                myFood.sort((a, b) => a.name.localeCompare(b.name));
                setFoods(myFood);
            });
            ApiGetUserEvents().then((myEvents) => setEvents(myEvents));
            ApiGetUserEventLog().then((myEventlog) => setEventlog(myEventlog));
            ApiGetUserEventFoodLog(me.event_history_fetch_limit).then((myEventLogs) => setEventlogsWithFoodlogs(myEventLogs));
            setUser(me);
        });
    }, [refresh]);

    if (user === null) {
        return <LoginPage doRefresh={doRefresh} />;
    }

    return (
        <main className="p-4 sm:p-8 md:p-16">
            <Router hook={useHashLocation}>
                <Header user={user} />

                {errorMsg !== null && <div className="text-c-l-red"> {errorMsg} </div>}

                {foods !== null && events !== null && eventlog !== null && eventlogsWithFoodlogs !== null && (
                    <Switch>
                        <Route path="/events">
                            <EventsPage
                                user={user}
                                setUser={setUser}
                                foods={foods}
                                setFoods={setFoods}
                                events={events}
                                setEvents={setEvents}
                                eventlog={eventlog}
                                setEventlog={setEventlog}
                                eventlogs={eventlogsWithFoodlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
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
                                eventlog={eventlog}
                                setEventlog={setEventlog}
                                eventlogs={eventlogsWithFoodlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
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
                                eventlog={eventlog}
                                setEventlog={setEventlog}
                                eventlogs={eventlogsWithFoodlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
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
                                eventlog={eventlog}
                                setEventlog={setEventlog}
                                eventlogs={eventlogsWithFoodlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
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
                                eventlog={eventlog}
                                setEventlog={setEventlog}
                                eventlogs={eventlogsWithFoodlogs}
                                setEventLogs={setEventlogsWithFoodlogs}
                                setErrorMsg={setErrorMsg}
                            />
                        </Route>

                        <Route>
                            <NotFound />
                        </Route>
                    </Switch>
                )}
            </Router>
        </main>
    );
}

render(<App />, document.getElementById('app'));
