// The one editor shell for creating and editing things: a modal <dialog>,
// full screen on phones and centered on wider windows
// (https://m3.material.io/components/dialogs/guidelines). The native modal
// dialog keeps focus inside, makes the page behind it inert and closes on
// Escape (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
//
// Mount it to open it and unmount it to close it: the parent keeps the
// "is it open" state and onClose clears it. Focus moves to the first field
// on open and back to whatever had it before on close.

import {ComponentChildren} from 'preact';
import {useEffect, useId, useLayoutEffect, useRef} from 'preact/hooks';
import {Icon} from './icons';

type EditorDialogProps = {
    title: string;
    // Shown next to the title, such as the event's time.
    subtitle?: ComponentChildren;
    // The save button's text: a specific verb ("Create Event", "Save").
    saveLabel: string;
    saving?: boolean;
    onSave: () => void;
    // Called by the close button, Cancel and Escape.
    onClose: () => void;
    // Pinned below the scrolling fields, such as totals.
    summary?: ComponentChildren;
    children: ComponentChildren;
};

// The fields that can take focus when the dialog opens; tabindex -1 marks
// fields kept out of the Tab order on purpose, such as the rarely changed
// event date and time.
const FOCUSABLE = 'input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled])';

export function EditorDialog({
    title,
    subtitle,
    saveLabel,
    saving = false,
    onSave,
    onClose,
    summary,
    children,
}: EditorDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    // Kept current so the effects below, which run once, call the latest one.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (dialog === null) {
            return undefined;
        }
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        dialog.showModal();
        const first = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();

        return () => {
            dialog.close();
            // After the page's own update (a save can re-sort a list, and moving
            // a node drops its focus). The opener may be gone (a menu item);
            // then focus stays where the browser puts it.
            setTimeout(() => {
                if (opener?.isConnected) {
                    opener.focus();
                }
            }, 0);
        };
    }, []);

    // Phones: fit the dialog to the visible area, so the on-screen keyboard
    // does not cover its bottom (the totals). index.html asks Chrome to
    // resize the page for the keyboard (interactive-widget); this covers
    // browsers and WebViews that only shrink the visual viewport.
    useEffect(() => {
        const dialog = dialogRef.current;
        const vv = window.visualViewport;
        if (dialog === null || !vv) {
            return undefined;
        }
        const phone = window.matchMedia('(width < 40rem)');
        const fit = () => {
            if (phone.matches) {
                dialog.style.height = `${vv.height}px`;
                dialog.style.top = `${vv.offsetTop}px`;
            } else {
                dialog.style.height = '';
                dialog.style.top = '';
            }
        };
        fit();
        vv.addEventListener('resize', fit);
        vv.addEventListener('scroll', fit);
        phone.addEventListener('change', fit);
        return () => {
            vv.removeEventListener('resize', fit);
            vv.removeEventListener('scroll', fit);
            phone.removeEventListener('change', fit);
        };
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        // Escape fires "cancel": keep the dialog open and let the parent close it,
        // so its state and the dialog never disagree.
        const onCancel = (e: Event) => {
            e.preventDefault();
            onCloseRef.current();
        };
        dialog?.addEventListener('cancel', onCancel);
        return () => dialog?.removeEventListener('cancel', onCancel);
    }, []);

    const saveButton = (
        <button type="button" className="btn-success" onClick={onSave} aria-disabled={saving || undefined}>
            {saving ? 'Saving...' : saveLabel}
        </button>
    );

    return (
        <dialog ref={dialogRef} className="editor-dialog" aria-labelledby={titleId}>
            <div className="editor-dialog-header">
                {/* Phones only; wider windows close with Cancel at the bottom. */}
                <button type="button" className="editor-dialog-close sm:hidden" aria-label="Close" onClick={onClose}>
                    <Icon name="close" />
                </button>
                <div className="flex flex-1 flex-wrap items-baseline gap-x-4">
                    <h2 id={titleId}>{title}</h2>
                    {subtitle !== undefined && <small>{subtitle}</small>}
                </div>
                {/* Phones: the save action sits top right (MD3 full-screen dialog). */}
                <div className="sm:hidden">{saveButton}</div>
            </div>

            <div ref={bodyRef} className="editor-dialog-body">
                {children}
            </div>

            {summary !== undefined && <div className="editor-dialog-summary">{summary}</div>}

            {/* Wider windows: Cancel and Save at the bottom right. */}
            <div className="editor-dialog-footer">
                <button type="button" onClick={onClose}>
                    Cancel
                </button>
                {saveButton}
            </div>
        </dialog>
    );
}
