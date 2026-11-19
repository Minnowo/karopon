// Paging for long lists: a page shows the newest
// LIST_PAGE_SIZE items, and a "Load more" button at the bottom shows as many
// more as its number field asks for, fetching older ones from the server when
// the page does not have them yet.

import {RefObject} from 'preact';
import {useRef, useState} from 'preact/hooks';
import {ApiError} from '../api/api';
import {NumberInput} from './number_input';
import {ErrorDiv, ErrorDivMsg} from './error_div';

export const LIST_PAGE_SIZE = 25;

type ListPagingOptions = {
    // How many items the page could show from what it has in memory.
    total: number;
    // How many items the page has from the server, when that differs from
    // total (the time page hides running timers). Used to tell whether the
    // first fetch reached the end.
    loaded?: number;
    // Fetches up to n older items, adds them to the page's list, and resolves
    // to how many the server returned. Omit when the whole list is loaded.
    fetchOlder?: (n: number) => Promise<number>;
    // How many items the first fetch asked for. Fewer came back means the
    // server has no more.
    firstFetchSize?: number;
    // Called when a fetch finds the session has ended.
    onUnauthorized?: () => void;
};

export type ListPaging = {
    shown: number;
    amount: number;
    setAmount: (n: number) => void;
    hasMore: boolean;
    busy: boolean;
    error: ErrorDivMsg | null;
    loadMore: () => Promise<void>;
    listRef: RefObject<HTMLDivElement>;
    statusRef: RefObject<HTMLParagraphElement>;
    total: number;
};

// useListPaging tracks how many items of a list are shown. Render the first
// `shown` items as the direct children of the element given `listRef`; it may
// be a `contents` div so the items still lay out in the page's grid or flex.
export function useListPaging({
    total,
    loaded = total,
    fetchOlder,
    firstFetchSize = 0,
    onUnauthorized,
}: ListPagingOptions): ListPaging {
    const [shown, setShown] = useState<number>(LIST_PAGE_SIZE);
    const [amount, setAmount] = useState<number>(LIST_PAGE_SIZE);
    const [serverDone, setServerDone] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [error, setError] = useState<ErrorDivMsg | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLParagraphElement>(null);

    const serverMayHaveMore = fetchOlder !== undefined && !serverDone && firstFetchSize > 0 && loaded >= firstFetchSize;
    const hasMore = shown < total || serverMayHaveMore;

    const loadMore = async () => {
        const count = Math.max(1, Math.floor(amount));
        const target = shown + count;
        const missing = target - total;

        setError(null);

        if (missing > 0 && serverMayHaveMore) {
            setBusy(true);
            try {
                const got = await fetchOlder(missing);
                if (got < missing) {
                    setServerDone(true);
                }
            } catch (e) {
                if (e instanceof ApiError && e.isUnauthorizedError()) {
                    onUnauthorized?.();
                }
                setError(e instanceof Error ? e : `${e}`);
                return;
            } finally {
                setBusy(false);
            }
        }

        const firstNew = shown;
        setShown(target);

        // Move focus to the first new item so keyboard and screen reader users
        // continue there. The timeout runs after every pending render, including
        // the page's own update of its list.
        setTimeout(() => {
            const item = listRef.current?.children[firstNew];
            if (item instanceof HTMLElement) {
                item.tabIndex = -1;
                item.focus();
            } else {
                // Nothing new came back; the button may be gone, so keep focus near it.
                statusRef.current?.focus();
            }
        }, 0);
    };

    return {shown, amount, setAmount, hasMore, busy, error, loadMore, listRef, statusRef, total};
}

type LoadMoreProps = {
    paging: ListPaging;
    // The plural name of the items, such as "events".
    itemsName: string;
};

// LoadMore is the control under a paged list: how many are shown, and the
// field and button to show more.
export function LoadMore({paging, itemsName}: LoadMoreProps) {
    const {shown, amount, setAmount, hasMore, busy, error, loadMore, statusRef, total} = paging;

    // A list that fits in the first page needs neither a count nor a button.
    if (!hasMore && shown === LIST_PAGE_SIZE && total <= LIST_PAGE_SIZE) {
        return null;
    }

    const visible = Math.min(shown, total);

    return (
        <div className="flex flex-col items-center gap-2 my-4">
            <p ref={statusRef} tabIndex={-1} role="status">
                <small>{hasMore ? `Showing the newest ${visible} ${itemsName}.` : `Showing all ${visible} ${itemsName}.`}</small>
            </p>

            <ErrorDiv errorMsg={error} />

            {hasMore && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <NumberInput
                        label="Number to load"
                        min={1}
                        step={LIST_PAGE_SIZE}
                        precision={0}
                        value={amount}
                        onValueChange={setAmount}
                    />
                    <button disabled={busy} onClick={() => void loadMore()}>
                        {busy ? 'Loading...' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
}
