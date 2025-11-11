import {HeaderState} from '../state/header_state';
import "./header.css"

export function Header(state: HeaderState) {
    return (
        <header>
            <div className="w-full flex flex-wrap">
                <div className="button-bar">
                    <a href="#/home" className="header-button">
                        <span className="button-content">
                            Home
                        </span>
                    </a>
                    &nbsp; &nbsp;
                    <a href="#/eventlog" className="header-button">
                        <span className="button-content">
                            Event Log
                        </span>    
                    </a>
                    &nbsp; &nbsp;
                    <a href="#/foodlog" className="header-button">
                        <span className="button-content">
                            Food Log
                        </span>    
                    </a>
                    &nbsp; &nbsp;
                    <a href="#/foods" className="header-button">
                        <span className="button-content">
                            Foods
                        </span>    
                    </a>
                </div>
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
