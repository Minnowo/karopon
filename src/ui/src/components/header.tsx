import {useState, useEffect} from 'preact/hooks';
import {HeaderState} from '../state/header_state';

type UserHeaderProps = {
    state: HeaderState;
};

export function UserHeader({state}: UserHeaderProps) {
    const [showDropDown, setShowDropDown] = useState<boolean>(false);

    return (
        <div
            className="relative"
            tabIndex={0}
            onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(next)) {
                    setShowDropDown(false);
                }
            }}
        >
            <a onClick={() => setShowDropDown(true)}>{state.user.name}</a>
            {showDropDown && (
                <div className="flex flex-col absolute left-0 z-10 container-theme p-2">
                    <a href="#settings" onClick={() => setShowDropDown(false)}>
                        Settings
                    </a>
                    <a href="#logout" onClick={() => setShowDropDown(false)}>
                        logout
                    </a>
                </div>
            )}
        </div>
    );
}

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
                    <UserHeader state={state} />
                </div>
            </div>
            <hr />
        </header>
    );
}
