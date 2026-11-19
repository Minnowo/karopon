// A button that opens a menu of actions or links, following the WAI-ARIA menu button
// pattern (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).

import {ComponentChildren} from 'preact';
import {useEffect, useId, useLayoutEffect, useRef, useState} from 'preact/hooks';
import {ThreeVertDots} from './svg';

// Space kept between the menu and the window edge, in CSS pixels.
const EDGE_GAP = 8;

// DropdownButtonAction is one menu item: an action (onClick) or a link (href).
export type DropdownButtonAction = {
    label: string;
    // Destructive actions are shown in the error color; the label must still say what happens.
    dangerous?: boolean;
    // Disabled items stay focusable so screen reader users learn they exist.
    disabled?: boolean;
    // Exactly one of onClick and href: onClick runs an action, href makes the item a link.
    onClick?: () => void;
    href?: string;
};

type DropdownProps = {
    actions: DropdownButtonAction[];
    // Visible button text. Without it the button shows three dots named "More actions".
    label?: string;
    // Shown before the label; decorative, the label names the button.
    icon?: ComponentChildren;
    // Classes for the wrapper; replaces its default h-fit w-fit.
    className?: string;
    buttonClassName?: string;
};

type MenuPlacement = {
    top: number;
    left: number;
    // Set when the menu is taller than the window, so it scrolls instead of running off it.
    maxHeight: number;
};

// DropdownButton renders a menu button. Opening the menu moves focus to an item; Up and Down
// arrows, Home and End move between items; Escape closes it and returns focus to the button;
// Tab closes it. The menu is fixed-positioned, so it is never clipped, and opens below the
// button unless there is more room above.
export function DropdownButton({
    actions,
    label = undefined,
    icon = undefined,
    className,
    buttonClassName = 'w-8 h-8 p-0 m-0 border-none bg-transparent hover:bg-c-surface-container-2',
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<MenuPlacement | null>(null);
    // Which item gets focus once the menu is placed: 0 for the first, -1 for the last, null when done.
    const focusOnOpen = useRef<number | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const baseId = useId();
    const triggerId = `${baseId}-trigger`;
    const menuId = `${baseId}-menu`;

    const items = (): HTMLElement[] =>
        menuRef.current ? Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];

    const openMenu = (focusIndex: number) => {
        focusOnOpen.current = focusIndex;
        setPlacement(null);
        setOpen(true);
    };

    const closeMenu = (returnFocus: boolean) => {
        setOpen(false);
        if (returnFocus) {
            triggerRef.current?.focus();
        }
    };

    // Place the menu once it is rendered and its size is known, then focus an item.
    useLayoutEffect(() => {
        if (!open || triggerRef.current === null || menuRef.current === null) {
            return;
        }
        const place = () => {
            if (triggerRef.current === null || menuRef.current === null) {
                return;
            }
            const t = triggerRef.current.getBoundingClientRect();
            const m = menuRef.current.getBoundingClientRect();
            const roomBelow = window.innerHeight - t.bottom;
            const maxHeight = window.innerHeight - 2 * EDGE_GAP;
            const height = Math.min(m.height, maxHeight);
            const below = roomBelow >= height + EDGE_GAP || roomBelow >= t.top;
            const top = below ? t.bottom : t.top - height;
            // Right-align with the button, then keep the whole menu inside the window.
            const left = Math.min(Math.max(t.right - m.width, EDGE_GAP), window.innerWidth - m.width - EDGE_GAP);
            setPlacement({
                top: Math.max(Math.min(top, window.innerHeight - height - EDGE_GAP), EDGE_GAP),
                left: Math.max(left, EDGE_GAP),
                maxHeight,
            });
        };
        place();

        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    // Focus an item once the menu is placed: a hidden element cannot take focus.
    useEffect(() => {
        if (!open || placement === null || focusOnOpen.current === null) {
            return;
        }
        const all = items();
        const index = focusOnOpen.current < 0 ? all.length - 1 : focusOnOpen.current;
        focusOnOpen.current = null;
        all[index]?.focus();
    }, [open, placement]);

    // A press anywhere outside the button and the menu closes it.
    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const onTriggerKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            openMenu(0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            openMenu(-1);
        }
    };

    const onMenuKeyDown = (e: KeyboardEvent) => {
        const all = items();
        const current = all.indexOf(document.activeElement as HTMLElement);
        const focusAt = (i: number) => all[(i + all.length) % all.length]?.focus();

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                focusAt(current + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                focusAt(current - 1);
                break;
            case 'Home':
                e.preventDefault();
                focusAt(0);
                break;
            case 'End':
                e.preventDefault();
                focusAt(all.length - 1);
                break;
            case 'Escape':
                e.preventDefault();
                closeMenu(true);
                break;
            case 'Enter':
                // A held Enter that opened the menu must not repeat onto the first item.
                if (e.repeat) {
                    e.preventDefault();
                }
                break;
            case 'Tab':
                // Focus moves on from the button, as if the menu had never been opened.
                closeMenu(true);
                break;
        }
    };

    const choose = (action: DropdownButtonAction) => {
        if (action.disabled) {
            return;
        }
        closeMenu(true);
        // After focus is back on the button, so an action that moves focus (e.g. opens a form) wins.
        action.onClick?.();
    };

    // Keyboard focus is shown with the same fill as mouse hover, not an outline, so the current item
    // reads as selected. Disabled items get the focus fill too, so keyboard users see where they are.
    const itemClass = (action: DropdownButtonAction) =>
        `block w-full min-h-12 text-left wsnw rounded-none border-none bg-c-surface-container-3 px-4 py-3 no-underline ` +
        `outline-none focus-visible:outline-none focus-visible:bg-c-surface-container-5 not-aria-disabled:hover:bg-c-surface-container-5 ` +
        `${action.dangerous ? 'text-c-error' : 'text-c-on-surface'} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className={className ?? 'h-fit w-fit'}>
            <button
                id={triggerId}
                ref={triggerRef}
                type="button"
                className={`std-focus ${buttonClassName}`}
                aria-label={label === undefined ? 'More actions' : undefined}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                onClick={() => (open ? closeMenu(true) : openMenu(0))}
                onKeyDown={onTriggerKeyDown}
            >
                {label === undefined ? (
                    ThreeVertDots
                ) : (
                    <>
                        {icon}
                        {label}
                    </>
                )}
            </button>

            {open && (
                <div
                    id={menuId}
                    ref={menuRef}
                    role="menu"
                    aria-labelledby={triggerId}
                    className="fixed z-50 min-w-40 rounded-sm overflow-y-auto bg-c-surface-container-3"
                    // Hidden until placed, so it never flashes in the wrong spot.
                    style={
                        placement === null
                            ? {top: 0, left: 0, visibility: 'hidden'}
                            : {top: placement.top, left: placement.left, maxHeight: placement.maxHeight}
                    }
                    onKeyDown={onMenuKeyDown}
                >
                    {actions.map((action, i) =>
                        action.href !== undefined && !action.disabled ? (
                            <a
                                key={i}
                                role="menuitem"
                                tabIndex={-1}
                                href={action.href}
                                className={itemClass(action)}
                                onClick={() => closeMenu(true)}
                                onKeyDown={(e) => {
                                    // Links follow on Enter by themselves; Space is the menu item key too.
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                        e.currentTarget.click();
                                    }
                                }}
                            >
                                {action.label}
                            </a>
                        ) : (
                            // A div, not a button: ponkotsu's button base style forces an outline on focus
                            // (std-focus with !important), and these items show focus with the hover fill.
                            <div
                                key={i}
                                role="menuitem"
                                tabIndex={-1}
                                aria-disabled={action.disabled || undefined}
                                className={`cursor-pointer ${itemClass(action)}`}
                                onClick={() => choose(action)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!e.repeat) {
                                            choose(action);
                                        }
                                    }
                                }}
                            >
                                {action.label}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
