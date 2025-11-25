import {HeaderState} from '../state/header_state';

export function Header(state: HeaderState) {
    return (
        <header>
            <div className="w-full flex flex-wrap">
                [<a href="#/home">home</a>
                &nbsp; &nbsp;
                <a href="#/eventlog">eventlog</a>
                &nbsp; &nbsp;
                <a href="#/foodlog">foodlog</a>
                &nbsp; &nbsp;
                <a href="#/foods">foods</a>
                &nbsp; &nbsp;
                <a href="#/bloodsugar">bloodsugar</a>]
                <span className="ml-auto">
                    [<a href="#/login">login</a>
                    &nbsp; &nbsp;
                    <a href="#/logout">logout</a>] &nbsp; &nbsp; [{state.user.name}]
                </span>
            </div>
            <hr />
        </header>
    );
}
