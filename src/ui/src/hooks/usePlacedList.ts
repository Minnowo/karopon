// Places a suggestion list next to its input: fixed to the
// visible area (visualViewport, which leaves out the on-screen keyboard),
// below the input, or above it when there is more room there, as for a field
// near the bottom of a dialog. Fixed, so a scrolling container such as a
// dialog body does not clip it. Used by FuzzySearch and TagInput.

import {RefObject} from 'preact';
import {useLayoutEffect, useState} from 'preact/hooks';
import {JSX} from 'preact/jsx-runtime';

// The list's tallest size and the room it keeps from the edge of the visible area, in CSS pixels.
const LIST_MAX_HEIGHT = 240;
const EDGE_GAP = 8;
const LIST_MIN_WIDTH = 320;

// Where the open list sits: fixed to the visible area, below the input, or
// above it when there is more room there (a field near the bottom of a
// dialog, or above the on-screen keyboard). Fixed, so a scrolling container
// such as a dialog body does not clip it.
type ListPlacement = {
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
};

// placeList measures input against the visible area (visualViewport, which
// excludes the on-screen keyboard) and picks the side with more room.
export function placeList(input: HTMLElement): ListPlacement {
    const rect = input.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewTop = vv ? vv.offsetTop : 0;
    const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const below = viewBottom - rect.bottom - EDGE_GAP;
    const above = rect.top - viewTop - EDGE_GAP;
    // At least as wide as the input, up to LIST_MIN_WIDTH so names do not wrap, and kept on screen.
    const width = Math.min(Math.max(rect.width, LIST_MIN_WIDTH), window.innerWidth - 2 * EDGE_GAP);
    const left = Math.max(EDGE_GAP, Math.min(rect.left, window.innerWidth - EDGE_GAP - width));
    const base = {left, width};

    if (below >= LIST_MAX_HEIGHT || below >= above) {
        return {...base, top: rect.bottom + 4, maxHeight: Math.min(LIST_MAX_HEIGHT, below)};
    }
    return {...base, bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(LIST_MAX_HEIGHT, above)};
}

// usePlacedList returns the style for a list that is open next to input:
// hidden until placed, so it never flashes in the wrong spot, then kept in
// place as things scroll or the keyboard opens.
export function usePlacedList(open: boolean, inputRef: RefObject<HTMLElement>): JSX.CSSProperties {
    const [placement, setPlacement] = useState<ListPlacement | null>(null);

    useLayoutEffect(() => {
        if (!open) {
            setPlacement(null);
            return undefined;
        }
        const place = () => {
            if (inputRef.current) {
                setPlacement(placeList(inputRef.current));
            }
        };
        place();
        const vv = window.visualViewport;
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        vv?.addEventListener('resize', place);
        vv?.addEventListener('scroll', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
            vv?.removeEventListener('resize', place);
            vv?.removeEventListener('scroll', place);
        };
    }, [open, inputRef]);

    if (placement === null) {
        return {visibility: 'hidden'};
    }
    return {
        left: placement.left,
        width: placement.width,
        maxHeight: placement.maxHeight,
        top: placement.top,
        bottom: placement.bottom,
    };
}
