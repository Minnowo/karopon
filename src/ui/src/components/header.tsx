import {useState, useEffect} from 'preact/hooks';
import {HeaderState} from '../state/header_state';
import {UserHeader} from './user_header';

export function Header(state: HeaderState) {
    const [currentHash, setCurrentHash] = useState(window.location.hash);

    useEffect(() => {
        const onHashChange = () => setCurrentHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const css = 'font-bold text-c-l-green';
    return (
            <header>
                <div className="w-full flex flex-wrap">
                    <span>
                        <a className={`${currentHash === '#events' ? css : ''} `} href="#events">
                            events
                        </a>
                        &nbsp;&nbsp;&nbsp;
                        <a className={`${currentHash === '#foods' ? css : ''} `} href="#foods">
                            foods
                        </a>
                        &nbsp;&nbsp;&nbsp;
                        <a className={`${currentHash === '#bloodsugar' ? css : ''} `} href="#bloodsugar">
                            bloodsugar
                        </a>
                        &nbsp;&nbsp;&nbsp;
                        <a className={`${currentHash === '#stats' ? css : ''} `} href="#stats">
                            stats
                        </a>
                    </span>
                    <div className="ml-auto mr-10 flex items-center">
                        [<UserHeader state={state}></UserHeader>]
                    </div>
                </div>
                <hr />
            </header>
        </>
    );
}
