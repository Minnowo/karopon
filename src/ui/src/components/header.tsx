import {useState, useEffect} from 'preact/hooks';
import {TblUser} from '../api/types';
import {OLD_FOOD_ROUTES} from '../pages/foodareapage';
import {DropdownButton} from './drop_down_button';

type UserHeaderProps = {
    user: TblUser;
};

// UserHeader is the user's own menu: account pages and logout.
export function UserHeader({user}: UserHeaderProps) {
    return (
        <DropdownButton
            label={user.name}
            buttonClassName="bg-transparent border-none rounded-none p-0 text-c-primary"
            actions={[
                {label: 'Settings', href: '#settings'},
                {label: 'Sessions', href: '#sessions'},
                {label: 'Tags', href: '#tags'},
                {label: 'Body Metrics', href: '#body-metrics'},
                {label: 'Data Export', href: '#data-export'},
                {label: 'Log out', href: '#logout'},
            ]}
        />
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
    const isWorkout = currentHash === '#workout' || currentHash.startsWith('#workout/');
    // The food page is also the start page, shown for an empty or unknown hash.
    const isFood =
        currentHash === '' || currentHash === '#food' || currentHash.startsWith('#food/') || currentHash in OLD_FOOD_ROUTES;
    return (
        <header>
            <div className="w-full flex flex-wrap gap-3">
                <a className={isFood ? css : ''} aria-current={isFood ? 'page' : undefined} href="#food">
                    food
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
                <a className={isWorkout ? css : ''} aria-current={isWorkout ? 'page' : undefined} href="#workout">
                    workout
                </a>
                <div className="ml-auto mr-10 flex items-center">
                    <UserHeader user={state.user} />
                </div>
            </div>
            <hr />
        </header>
    );
}
