import {HeaderState} from '../state/header_state';

export function Header(state: HeaderState) {
    return (
        <header>
            <div className="w-full flex flex-wrap">
                [<a href="#/events">events</a>
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
