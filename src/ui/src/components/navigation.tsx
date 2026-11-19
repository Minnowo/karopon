// The app's navigation: a bottom navigation bar on phones and tablets, a
// navigation rail on wide windows
// (https://m3.material.io/components/navigation-bar/guidelines,
// https://m3.material.io/components/navigation-rail/guidelines). The bar has
// four pages and "More", which opens a bottom sheet with the other pages and
// the account pages; the rail has every page and the account menu.

import {useRef} from 'preact/hooks';
import {TblUser} from '../api/types';
import {DropdownButton} from './drop_down_button';
import {Icon, IconName} from './icons';

type NavPage = {
    href: string;
    label: string;
    icon: IconName;
    // Shown in the phone bar; the others are under More.
    inBar: boolean;
};

export const NAV_PAGES: NavPage[] = [
    {href: '#food', label: 'Food', icon: 'restaurant', inBar: true},
    {href: '#time', label: 'Time', icon: 'timer', inBar: true},
    {href: '#goals', label: 'Goals', icon: 'flag', inBar: false},
    {href: '#body', label: 'Body', icon: 'monitorWeight', inBar: false},
    {href: '#stats', label: 'Stats', icon: 'barChart', inBar: true},
    {href: '#activity', label: 'Activity', icon: 'directionsRun', inBar: false},
    {href: '#workout', label: 'Workout', icon: 'fitnessCenter', inBar: true},
];

export const ACCOUNT_PAGES = [
    {href: '#settings', label: 'Settings'},
    {href: '#sessions', label: 'Sessions'},
    {href: '#tags', label: 'Tags'},
    {href: '#body-metrics', label: 'Body Metrics'},
    {href: '#data-export', label: 'Data Export'},
    {href: '#logout', label: 'Log out'},
];

// CurrentPage returns the href of the nav or account page that route shows.
// A page's tabs (#food/library) belong to it; an empty or unknown route shows
// the food page, the start page.
export function CurrentPage(route: string): string {
    for (const p of [...NAV_PAGES, ...ACCOUNT_PAGES]) {
        if (route === p.href || route.startsWith(`${p.href}/`)) {
            return p.href;
        }
    }
    return '#food';
}

// PageTitle returns the document title for route.
export function PageTitle(route: string): string {
    const current = CurrentPage(route);
    const page = [...NAV_PAGES, ...ACCOUNT_PAGES].find((p) => p.href === current);
    return `${page?.label ?? 'Food'} - Karopon`;
}

type NavItemProps = {
    page: NavPage;
    current: boolean;
};

function NavItem({page, current}: NavItemProps) {
    return (
        <a
            className="nav-item"
            href={page.href}
            aria-current={current ? 'page' : undefined}
            onClick={() => {
                // MD3: choosing the current destination again scrolls to the top.
                if (current) {
                    window.scrollTo({top: 0});
                }
            }}
        >
            <span className="nav-indicator">
                <Icon name={page.icon} filled={current} />
            </span>
            {page.label}
        </a>
    );
}

type NavigationProps = {
    user: TblUser;
    // The hash route shown, to mark the current page.
    route: string;
};

export function Navigation({user, route}: NavigationProps) {
    const current = CurrentPage(route);
    const moreRef = useRef<HTMLDialogElement>(null);
    const morePages = NAV_PAGES.filter((p) => !p.inBar);
    const moreIsCurrent = !NAV_PAGES.some((p) => p.inBar && p.href === current);

    const closeMore = () => moreRef.current?.close();

    return (
        <>
            {/* Phone and tablet: bottom bar. */}
            <nav aria-label="Main" className="nav-bar">
                <ul>
                    {NAV_PAGES.filter((p) => p.inBar).map((p) => (
                        <li key={p.href}>
                            <NavItem page={p} current={current === p.href} />
                        </li>
                    ))}
                    <li>
                        <button
                            type="button"
                            className="nav-item"
                            aria-haspopup="dialog"
                            aria-current={moreIsCurrent ? 'page' : undefined}
                            onClick={() => moreRef.current?.showModal()}
                        >
                            <span className="nav-indicator">
                                <Icon name="moreHoriz" filled={moreIsCurrent} />
                            </span>
                            More
                        </button>
                    </li>
                </ul>
            </nav>

            <dialog
                ref={moreRef}
                className="nav-sheet surface-1"
                aria-labelledby="nav-sheet-title"
                // A click on the backdrop lands on the dialog itself.
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        closeMore();
                    }
                }}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <h2 id="nav-sheet-title" className="flex-1">
                            More
                        </h2>
                        <button type="button" aria-label="Close" onClick={closeMore}>
                            <Icon name="close" />
                        </button>
                    </div>
                    <ul className="flex flex-col">
                        {morePages.map((p) => (
                            <li key={p.href}>
                                <a
                                    className="nav-sheet-item"
                                    href={p.href}
                                    aria-current={current === p.href ? 'page' : undefined}
                                    onClick={closeMore}
                                >
                                    <Icon name={p.icon} filled={current === p.href} />
                                    {p.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <hr />
                    <div className="flex flex-col gap-1">
                        <small>Signed in as {user.name}</small>
                        <ul className="flex flex-col">
                            {ACCOUNT_PAGES.map((p) => (
                                <li key={p.href}>
                                    <a
                                        className="nav-sheet-item"
                                        href={p.href}
                                        aria-current={current === p.href ? 'page' : undefined}
                                        onClick={closeMore}
                                    >
                                        {p.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </dialog>

            {/* Wide windows: rail with every page, the account menu at the bottom. */}
            <nav aria-label="Main" className="nav-rail">
                <ul>
                    {NAV_PAGES.map((p) => (
                        <li key={p.href}>
                            <NavItem page={p} current={current === p.href} />
                        </li>
                    ))}
                </ul>
                <DropdownButton
                    className="w-full"
                    label={user.name}
                    icon={<Icon name="accountCircle" />}
                    buttonClassName="nav-item nav-account"
                    actions={ACCOUNT_PAGES}
                />
            </nav>
        </>
    );
}
