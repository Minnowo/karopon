import {render} from 'preact';
import {Router, Route, Switch} from 'wouter-preact';
import {useHashLocation} from 'wouter-preact/use-hash-location';

import {Header} from './components/header.jsx';
import {ListPage} from './pages/listpage/index.jsx';
import {LoginPage} from './pages/login/index.jsx';
import {NotFound} from './pages/_404.jsx';

import {useEffect, useState} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserEvent} from './api/types';
import {WhoAmI, UserFoods, UserEvents} from './api/api';
import {LogoutPage} from './pages/logout/index.js';

export function App() {
    const [user, setUser] = useState<TblUser | null>(null);
    const [foods, setFoods] = useState<Array<TblUserFood> | null>(null);
    const [events, setEvents] = useState<Array<TblUserEvent> | null>(null);

    useEffect(() => {
        WhoAmI().then((me) => setUser(me));
        UserFoods().then((myFood) => setFoods(myFood));
        UserEvents().then((myEvents) => setEvents(myEvents));
    }, []);

    if (user === null) {
        return <LoginPage />;
    }
    if (foods === null || events === null) {
        return <div>loading...</div>;
    }

    return (
        <Router hook={useHashLocation}>
            <Header />

            <Switch>
                <Route path="/">
                    <ListPage user={user} foods={foods} events={events} />
                </Route>
                <Route path="/logout">
                    <LogoutPage />
                </Route>
                <Route path="/list">
                    <ListPage user={user} foods={foods} events={events} />
                </Route>
                <Route>
                    {' '}
                    <NotFound />{' '}
                </Route>
            </Switch>
        </Router>
    );
}

render(<App />, document.getElementById('app'));
