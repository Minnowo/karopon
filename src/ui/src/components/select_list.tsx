import { Ref } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useDebouncedCallback } from "../hooks/useDebounce";

type FuzzySearchProps<T> = {
    data: T[];
    searchKey: keyof T;
    query: string;
    onSelect: (item: T) => void;
    onQueryChange?: (query: string) => void;

    placeholder?: string;
    class?: string;
};

export function FuzzySearch<T>({
    query,
    onQueryChange,
    data,
    searchKey,
    placeholder = "",
    class: className,
    onSelect,
}: FuzzySearchProps<T>) {
    const container: Ref<HTMLDivElement> = useRef();
    const input: Ref<HTMLInputElement> = useRef();
    const list: Ref<HTMLUListElement> = useRef();
    const didSubmit: Ref<boolean> = useRef(false);

    const [open, setOpen] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [matches, setMatches] = useState<T[] | null>(null);

    const debounceSetQuery = useDebouncedCallback(
        (q: string) => onQueryChange(q),
        300,
    );

    useEffect(() => {
        if (didSubmit.current) {
            didSubmit.current = false;
            return;
        }

        if (onQueryChange) {
            onQueryChange(query);
        }
        console.info("update query");
        if (!query) {
            setMatches(null);
            setOpen(false);
            setSelectedIndex(null);
        } else {
        console.info("update query");
            const m = data.filter((item) =>
                String(item[searchKey])
                    .toLowerCase()
                    .includes(query.toLowerCase()),
            );

            setMatches(m);
            setOpen(true);
        }
    }, [query, data, searchKey, onQueryChange]);

    const doSelect = (item: T) => {
        if (!item) {
            return;
        }
        onQueryChange(item[searchKey] as string);
        setMatches(null);
        setOpen(false);
        setSelectedIndex(null);
        didSubmit.current = true;
        onSelect(item);
    };

    const onFocusOut = (event: FocusEvent) => {
        const next = event.relatedTarget as HTMLElement | null;

        if (next && container.current?.contains(next)) {
            return;
        }

        if (open) {
            setOpen(false);
        }
    };

    const openOnFocusIn = () => {
        // prevent tabbing into the textbox selecting all the text
        if (input.current.selectionEnd - input.current.selectionStart > 1) {
            input.current.setSelectionRange(
                input.current.value.length,
                input.current.value.length,
            );
        }

        if (didSubmit.current) {
            return;
        }
        if (matches && matches.length > 0 && !open) {
            setOpen(true);
        }
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
        }
        if (event.key === "Enter") {
            event.preventDefault();
            if (!matches || matches.length == 0) {
                setOpen(false);
            } else if (selectedIndex >= 0 && selectedIndex < matches.length) {
                doSelect(matches[selectedIndex]);
            }
        }
        if (!open) {
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();

            if (selectedIndex === null) {
                setSelectedIndex(0);
            } else if (event.shiftKey) {
                setSelectedIndex(
                    (selectedIndex - 1 + matches.length) % matches.length,
                );
            } else {
                setSelectedIndex((selectedIndex + 1) % matches.length);
            }
        }
    };
    console.info("oepn", open);

    return (
        <div ref={container} class={className} onFocusOut={onFocusOut}>
            <input
                class="w-full"
                ref={input}
                type="text"
                placeholder={placeholder}
                value={query}
                onInput={(e) =>
                    debounceSetQuery((e.target as HTMLInputElement).value)
                }
                onKeyDown={onKeyDown}
                onFocusIn={openOnFocusIn}
            />
            {open && (
                <ul
                    ref={list}
                    class={`absolute z-10 border mt-1 max-h-60 overflow-auto rounded shadow`}
                >
                    {matches && matches.length > 0 ? (
                        matches.map((item, i) => (
                            <li
                                tabindex={0}
                                key={item[searchKey]}
                                class={`${selectedIndex === i ? "bg-c-l-black" : "bg-c-black"}  p-2 hover:bg-gray-100 cursor-pointer`}
                                onClick={() => doSelect(item)}
                            >
                                {item[searchKey] as string}
                            </li>
                        ))
                    ) : (
                        <li class="bg-c-black  p-2 hover:bg-gray-100 cursor-pointer">
                            {" "}
                            no results{" "}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
