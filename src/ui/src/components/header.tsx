import {HeaderState} from '../state/header_state';
import {UserHeader} from './user_header';

export function Header(state: HeaderState) {
    return (
        <header>
            <div className="w-full flex flex-wrap">
                [<a href="#/events">events</a>
                &nbsp; &nbsp;
                <a href="#/foods">foods</a>
                &nbsp; &nbsp;
                <a href="#/bloodsugar">bloodsugar</a>
                &nbsp; &nbsp;
                <a href="#/stats">stats</a>]{/* <span className="ml-auto mr-5">{state.user.name}</span> */}
                <div className="ml-auto mr-10 flex items-center">
                    [<UserHeader state={state}></UserHeader>]
                </div>
            </div>
            <hr />
        </header>
    );
}
