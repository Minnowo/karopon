import { render } from 'preact';
import { Router, Route, Switch } from 'wouter-preact';
import { useHashLocation } from "wouter-preact/use-hash-location";

import { Header } from './components/header.jsx';
import { ListPage } from './pages/listpage/index.jsx';
import { LoginPage } from './pages/login/index.jsx';
import { NotFound } from './pages/_404.jsx';

import { useEffect, useState } from "preact/hooks";
import { TblUser } from "./api/types";
import { WhoAmI } from "./api/api";
import { LogoutPage } from './pages/logout/index.js';

export function App() {

    const [user, setUser] = useState<TblUser | null>(null);

    useEffect(() => {
          WhoAmI().then(me => setUser(me));
    }, []);

    if(user === null) {
        return <LoginPage />
    }

	return (
		<Router hook={useHashLocation}>
			<Header />

            <Switch>
            <Route path="/">
                <ListPage user={user} />
            </Route>
            <Route path="/logout">
                <LogoutPage />
            </Route>
            <Route path="/list">
                <ListPage user={user} />
            </Route>
            <Route> <NotFound /> </Route>
            </Switch>
		</Router>
	);
}

render(<App />, document.getElementById('app'));
