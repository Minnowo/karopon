import {useState, useEffect} from 'preact/hooks';
import {HeaderState} from '../state/header_state';


export function Header(state: HeaderState) {
    const [currentHash, setCurrentHash] = useState(window.location.hash);

    useEffect(() => {
        const onHashChange = () => setCurrentHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const css = 'font-bold text-c-l-green';
    return (
        <>
            <header>
                <div className="w-full flex flex-wrap">
                    [
                    <a className={`${currentHash === '#events' ? css : ''} `} href="#events">
                        events
                    </a>{' '}
                    &nbsp; &nbsp;
                    <a className={`${currentHash === '#foods' ? css : ''} `} href="#foods">
                        foods
                    </a>{' '}
                    &nbsp; &nbsp;
                    <a className={`${currentHash === '#bloodsugar' ? css : ''} `} href="#bloodsugar">
                        bloodsugar
                    </a>{' '}
                    &nbsp; &nbsp;
                    <a className={`${currentHash === '#stats' ? css : ''} `} href="#stats">
                        stats
                    </a>
                    ]
                    <span className="ml-auto">
                        [<a href="#/logout">logout</a> &nbsp; &nbsp; {state.user.name}]
                    </span>
                </div>
                <hr />
            </header>
        </>
    );
}









