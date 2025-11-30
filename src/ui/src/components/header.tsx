import {useState, useEffect} from 'preact/hooks';
import {HeaderState} from '../state/header_state';
import {Footer} from './footer';

export function Header(state: HeaderState) {
    const [currentHash, setCurrentHash] = useState(window.location.hash);

    useEffect(() => {
        const onHashChange = () => setCurrentHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const css = 'font-bold text-c-l-green';

    return (
    <div className="flex flex-col min-h-screen">
        <header className ="flex-shrink-0">
            <div>
                    <a className={`${currentHash === '#events' ? css : ''} `} href="#events">events</a>
                 
                    <a className={`${currentHash === '#foods' ? css : ''} `} href="#foods">
                        foods </a>
               
                    <a className={`${currentHash === '#bloodsugar' ? css : ''} `} href="#bloodsugar"> bloodsugar </a>
            
                    <a className={`${currentHash === '#stats' ? css : ''} `} href="#stats">stats </a>
                <span className="ml-auto">
                    <a href="#/login">login</a>
                    <a href="#/logout">logout</a>
                    <span>[{state.user.name}]</span> 
                </span>
            </div>
            <hr />
        </header>

        <main className="flex-1">
        {/*footer stuf here*/}
        </main>

        <Footer />
    </div>
    );
}