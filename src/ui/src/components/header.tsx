import {useState, useEffect} from 'preact/hooks';
import {TblUser} from '../api/types';

type UserHeaderProps = {
    user: TblUser;
};

export function UserHeader({user}: UserHeaderProps) {
    const [showDropDown, setShowDropDown] = useState<boolean>(false);

    return (
        <div
            className="relative"
            onFocusOut={(e) => {
                const next = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(next)) {
                    setShowDropDown(false);
                }
            }}
        >
            <button
                tabIndex={0}
                type="button"
                className="std-focus bg-transparent border-none rounded-none p-0 text-c-yellow"
                aria-haspopup="menu"
                aria-expanded={showDropDown}
                onClick={() => setShowDropDown(true)}
            >
                {user.name}
            </button>
            {showDropDown && (
                <div className="flex flex-col absolute left-0 z-10 container-theme p-2">
                    <a href="#settings" onClick={() => setShowDropDown(false)}>
                        Settings
                    </a>
                    <a href="#sessions" onClick={() => setShowDropDown(false)}>
                        Sessions
                    </a>
                    <a href="#tags" onClick={() => setShowDropDown(false)}>
                        Tags
                    </a>
                    <a href="#body-metrics" className="wsnw" onClick={() => setShowDropDown(false)}>
                        Body Metrics
                    </a>
                    <a href="#data-export" className="wsnw" onClick={() => setShowDropDown(false)}>
                        Data Export
                    </a>
                    <a href="#logout" onClick={() => setShowDropDown(false)}>
                        logout
                    </a>
                </div>
            )}
        </div>
    );
}

type HeaderState = {
    user: TblUser;
};
export function Header(state: HeaderState) {
    const [currentHash, setCurrentHash] = useState(window.location.hash);

    useEffect(() => {
        const onHashChange = () => setCurrentHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const css = 'font-bold';
    return (
        <header>
            <div className="w-full flex flex-wrap gap-3">
                <a
                    className={currentHash === '#events' ? css : ''}
                    aria-current={currentHash === '#events' ? 'page' : undefined}
                    href="#events"
                >
                    events
                </a>
                <a
                    className={currentHash === '#foods' ? css : ''}
                    aria-current={currentHash === '#foods' ? 'page' : undefined}
                    href="#foods"
                >
                    foods
                </a>
                <a
                    className={currentHash === '#time' ? css : ''}
                    aria-current={currentHash === '#time' ? 'page' : undefined}
                    href="#time"
                >
                    time
                </a>
                <a
                    className={currentHash === '#goals' ? css : ''}
                    aria-current={currentHash === '#goals' ? 'page' : undefined}
                    href="#goals"
                >
                    goals
                </a>
                <a
                    className={currentHash === '#body' ? css : ''}
                    aria-current={currentHash === '#body' ? 'page' : undefined}
                    href="#body"
                >
                    body
                </a>
                <a
                    className={currentHash === '#stats' ? css : ''}
                    aria-current={currentHash === '#stats' ? 'page' : undefined}
                    href="#stats"
                >
                    stats
                </a>
                <a
                    className={currentHash === '#activity' ? css : ''}
                    aria-current={currentHash === '#activity' ? 'page' : undefined}
                    href="#activity"
                >
                    activity
                </a>
                <div className="ml-auto mr-10 flex items-center">
                    <UserHeader user={state.user} />
                </div>
            </div>
            <hr />
        </header>
    );
}
