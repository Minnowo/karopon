import {useEffect, useRef, useState, useCallback} from 'preact/hooks';
import {useDebouncedCallback} from '../hooks/useDebounce';

type FuzzySearchProps<T> = {
    data: T[];
    dataDisplayStr: (item: T) => string;
    dataSearchStr: (item: T) => string;
    query: string;
    onSelect: (item: T | null) => void;
    onQueryChange?: (query: string) => void;
    placeholder?: string;
    className?: string;
    noResultsText?: string;
    autofocus?: boolean;
};

export function FuzzySearch<T>(p: FuzzySearchProps<T>) {
    const {
        data,
        dataDisplayStr,
        dataSearchStr,
        onSelect,
        onQueryChange,
        query,
        placeholder = '',
        noResultsText = 'No Results',
        className,
        autofocus,
    } = p;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    const [open, setOpen] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [matches, setMatches] = useState<T[] | null>(null);

    const doSearch = useCallback(
        (search: string) => {
            if (!search) {
                setMatches(null);
                setOpen(false);
                setSelectedIndex(null);
            } else {
                const m = data.filter((item) => dataSearchStr(item).toLowerCase().includes(search.toLowerCase()));

                if (m && m.length > 0) {
                    setSelectedIndex(0);
                }
                setMatches(m);
                setOpen(document.activeElement === inputRef.current);
            }
        },
        [data, dataSearchStr]
    );

    const [debounceSearch, abortDebounce] = useDebouncedCallback(doSearch, 300);

    useEffect(() => {
        if (autofocus) {
            inputRef.current?.focus();
        }
    }, [autofocus]);

    useEffect(() => {
        if (listRef.current && matches && matches.length > 0 && selectedIndex !== null) {
            const selectedItem = listRef.current.children[selectedIndex] as HTMLUListElement;
            if (selectedItem) {
                listRef.current.scrollTo({
                    top: selectedItem.offsetTop - (listRef.current.clientHeight - selectedItem.offsetHeight) / 2,
                    behavior: 'smooth',
                });
            }
        }
    }, [selectedIndex, matches]);

    const doSelect = (item: T | null) => {
        if (!item) {
            onSelect(null);
            return;
        }
        if (onQueryChange) {
            onQueryChange(dataSearchStr(item));
        }
        setMatches(null);
        setOpen(false);
        setSelectedIndex(null);
        onSelect(item);
    };

    const onFocusOut = (event: FocusEvent) => {
        const next = event.relatedTarget as HTMLElement | null;

        if (next && containerRef?.current?.contains(next)) {
            return;
        }

        abortDebounce();

        if (open) {
            setOpen(false);
        }
    };

    const openOnFocusIn = () => {
        // prevent tabbing into the textbox selecting all the text
        if (inputRef.current && inputRef.current.selectionEnd !== null && inputRef.current.selectionStart !== null) {
            if (inputRef.current.selectionEnd - inputRef.current.selectionStart > 1) {
                inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
            }
        }
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            if (open) {
                event.preventDefault();
                setOpen(false);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (!open) {
                doSelect(null);
            } else if (selectedIndex === null) {
                setOpen(false);
            } else if (!matches || matches.length === 0) {
                setOpen(false);
            } else if (selectedIndex >= 0 && selectedIndex < matches.length) {
                doSelect(matches[selectedIndex]);
            }
            return;
        }
        if (!open || matches === null || matches.length === 0) {
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (selectedIndex === null) {
                setSelectedIndex(0);
            } else {
                setSelectedIndex((selectedIndex + 1) % matches.length);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (selectedIndex === null) {
                setSelectedIndex(0);
            } else {
                setSelectedIndex((selectedIndex - 1 + matches.length) % matches.length);
            }
        } else if (event.key === 'Tab') {
            event.preventDefault();

            if (selectedIndex === null) {
                setSelectedIndex(0);
            } else if (event.shiftKey) {
                setSelectedIndex((selectedIndex - 1 + matches.length) % matches.length);
            } else {
                setSelectedIndex((selectedIndex + 1) % matches.length);
            }
        }
    };

    return (
        <div ref={containerRef} class={className} onFocusOut={onFocusOut}>
            <input
                class="w-full"
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    debounceSearch(val);
                    if (p.onQueryChange) { p.onQueryChange(val); }
                }}
                onKeyDown={onKeyDown}
                onFocusIn={openOnFocusIn}
            />
            {open && (
                <ul ref={listRef} class={`absolute z-10 border mt-1 max-h-60 overflow-auto rounded shadow smooth-scroll`}>
                    {matches && matches.length > 0 ? (
                        matches.map((item, i) => {
                            const key = dataDisplayStr(item);
                            return (
                                <li
                                    tabindex={-1}
                                    key={key}
                                    class={`${selectedIndex === i ? 'bg-c-l-black' : 'bg-c-black'}  p-2 hover:bg-c-l-black cursor-pointer`}
                                    onClick={() => doSelect(item)}
                                >
                                    {key}
                                </li>
                            );
                        })
                    ) : (
                        <li class="bg-c-black  p-2 hover:bg-c-l-black cursor-pointer"> {noResultsText} </li>
                    )}
                </ul>
            )}
        </div>
    );
}
