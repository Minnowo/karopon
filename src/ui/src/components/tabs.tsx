// Tabs that switch between views of one page (WAI-ARIA tabs pattern,
// https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Each tab is a hash route, so a view can be
// linked to and Back returns to the previous one. Arrow keys, Home and End
// move between tabs and show the tab they land on.

import {ComponentChildren} from 'preact';
import {useEffect, useId, useRef} from 'preact/hooks';
import {JSX} from 'preact/jsx-runtime';

export type TabInfo = {
    // The hash route of the tab's view, such as "#food/library".
    href: string;
    label: string;
};

type TabsProps = {
    // The name of the tab list for screen readers, such as "Food".
    label: string;
    tabs: TabInfo[];
    // The href of the tab whose view is shown.
    selected: string;
    // The selected tab's view.
    children: ComponentChildren;
};

export function Tabs({label, tabs, selected, children}: TabsProps) {
    const baseId = useId();
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    // Set when the selection changed by keyboard, so focus follows it once the new view renders.
    const focusSelected = useRef<boolean>(false);

    const selectedIndex = Math.max(
        0,
        tabs.findIndex((t) => t.href === selected)
    );
    const tabId = (i: number) => `${baseId}-tab-${i}`;
    const panelId = `${baseId}-panel`;

    useEffect(() => {
        if (focusSelected.current) {
            focusSelected.current = false;
            tabRefs.current[selectedIndex]?.focus();
        }
    }, [selectedIndex]);

    const select = (i: number) => {
        if (i !== selectedIndex) {
            window.location.hash = tabs[i].href;
        }
    };

    const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
        let next: number;
        switch (e.key) {
            case 'ArrowRight':
                next = (selectedIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
                next = (selectedIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = tabs.length - 1;
                break;
            default:
                return;
        }
        e.preventDefault();
        focusSelected.current = true;
        select(next);
    };

    return (
        <div className="flex flex-col gap-4">
            <div role="tablist" aria-label={label} className="flex border-b border-c-outline-variant" onKeyDown={onKeyDown}>
                {tabs.map((t, i) => (
                    <button
                        key={t.href}
                        ref={(el) => {
                            tabRefs.current[i] = el;
                        }}
                        id={tabId(i)}
                        role="tab"
                        type="button"
                        aria-selected={i === selectedIndex}
                        aria-controls={panelId}
                        tabIndex={i === selectedIndex ? 0 : -1}
                        onClick={() => select(i)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div id={panelId} role="tabpanel" aria-labelledby={tabId(selectedIndex)}>
                {children}
            </div>
        </div>
    );
}
