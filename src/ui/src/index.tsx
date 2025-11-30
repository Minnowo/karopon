import {render} from 'preact';
import {Router, Route, Switch} from 'wouter-preact';
import {useHashLocation} from 'wouter-preact/use-hash-location';

import {Header} from './components/header.jsx';
import {HomePage} from './pages/home_page.jsx';
import {LoginPage} from './pages/login_page.jsx';
import {FoodPage} from './pages/foodpage';
import {BloodSugarPage} from './pages/bloodsugar_page.js';
import {StatsPage} from './pages/stats_page.js';

import {useEffect, useState} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent, TblUserEventLog, UserEventLogWithFoodLog} from './api/types';
import {GetUserEventLogWithFoodLog, WhoAmI, UserFoods, UserEvents, GetUserEventLog} from './api/api';
import {LogoutPage} from './pages/logout_page.js';
import {EventsPage} from './pages/eventpage';

export function App() {
    const [user, setUser] = useState<TblUser | null>(null);
    const [foods, setFoods] = useState<Array<TblUserFood> | null>(null);
    const [events, setEvents] = useState<Array<TblUserEvent> | null>(null);
    const [eventlog, setEventlog] = useState<Array<TblUserEventLog> | null>(null);
    const [eventlogsWithFoodlogs, setEventlogsWithFoodlogs] = useState<Array<UserEventLogWithFoodLog> | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        WhoAmI().then((me) => setUser(me));
        UserFoods().then((myFood) => {
            myFood.sort((a, b) => a.name.localeCompare(b.name));
            setFoods(myFood);
        });
        UserEvents().then((myEvents) => setEvents(myEvents));
        GetUserEventLog().then((myEventlog) => setEventlog(myEventlog));
        GetUserEventLogWithFoodLog().then((myEventLogs) => setEventlogsWithFoodlogs(myEventLogs));
    }, []);

    if (user === null) {
        return <LoginPage />;
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
                        <Route>
                            <HomePage
                                user={user}
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
                    </Switch>
                )}
            </Router>
        </main>
    );
}

render(<App />, document.getElementById('app'));
