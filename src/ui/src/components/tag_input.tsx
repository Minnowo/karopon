import {Dispatch, StateUpdater, useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {TblUserTag} from '../api/types';
import {HasNamespace, TagIsValid, SplitTag, TagToString} from '../utils/tags';
import {useDebouncedCallback} from '../hooks/useDebounce';
import {ApiGetUserNamespacesTags} from '../api/api';

type TagInputProps = {
    namespaces: string[];
    setNamespaces: Dispatch<StateUpdater<string[] | null>>;
    thisTags: TblUserTag[];
    onChange: (tags: TblUserTag[]) => void;
    placeholder?: string;
    disabled?: boolean;
    onSearchError?: (err: unknown) => void;
};

export function TagInput({
    namespaces,
    setNamespaces,
    thisTags,
    onChange,
    placeholder = 'Add tag',
    disabled = false,
    onSearchError = undefined,
}: TagInputProps) {
    const [input, setInput] = useState('');
    const [open, setOpen] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [tagSearch, setTagSearch] = useState<TblUserTag[]>(namespaces.map((n) => ({namespace: n, name: ''})));

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [hasNamespace, showCreateButton] = useMemo((): [boolean, boolean] => {
        const a = HasNamespace(input);
        const b = input.trim().length > 0 && (TagIsValid(input) || (!a && !namespaces.includes(input)));

        return [a, b];
    }, [input, namespaces]);

    useEffect(() => {
        if (listRef.current && (tagSearch.length > 0 || showCreateButton)) {
            const selectedItem = listRef.current.children[selectedIndex] as HTMLUListElement;

            if (selectedItem) {
                listRef.current.scrollTo({
                    top: selectedItem.offsetTop - (listRef.current.clientHeight - selectedItem.offsetHeight) / 2,
                    behavior: 'smooth',
                });
            }
        }
    }, [selectedIndex, tagSearch, showCreateButton]);

    const searchTag = useCallback(
        (searchTagStr: string) => {
            const tag2Search = SplitTag(searchTagStr);

            if (tag2Search.namespace === '') {
                // If there is no namespace, the user is still typing it.
                // We want to search the namespaces.
                setTagSearch(
                    namespaces
                        .filter((ns) => ns.startsWith(tag2Search.name))
                        .map((t) => {
                            return {
                                namespace: t,
                                name: '',
                            } as TblUserTag;
                        })
                );
            } else {
                ApiGetUserNamespacesTags(tag2Search.namespace, tag2Search.name)
                    .then((foundTags: TblUserTag[]) => setTagSearch(foundTags))
                    .catch(onSearchError);
            }
        },
        [namespaces, onSearchError]
    );

    const [debounceSearch, cancelDebounce] = useDebouncedCallback(searchTag, 400);

    const addTag = (raw: string) => {
        const tag = SplitTag(raw.trim());

        if (!tag.namespace || !tag.name) {
            return;
        }

        // If the user types a tag that's already in the list.
        // Remove it from the tag list.
        const filteredTags = thisTags.filter((x) => x.namespace !== tag.namespace || x.name !== tag.name);

        if (filteredTags.length === thisTags.length) {
            if (!namespaces.includes(tag.namespace)) {
                setNamespaces([tag.namespace, ...namespaces].sort());
            }
            onChange([...thisTags, tag]);
        } else {
            onChange(filteredTags);
        }

        setInput('');
        searchTag('');
        setSelectedIndex(0);
    };

    const TryAddTag = (tag: string) => {
        if (TagIsValid(tag)) {
            addTag(tag);
        } else {
            setInput(tag);
            searchTag(tag);
            setSelectedIndex(0);
        }
    };

    const removeTag = (index: number) => {
        onChange(thisTags.filter((_, i) => i !== index));
    };

    const onFocusOut = (event: FocusEvent) => {
        const next = event.relatedTarget as HTMLElement | null;

        if (next && containerRef?.current?.contains(next)) {
            return;
        }

        cancelDebounce();

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
        setOpen(true);
    };

    const moveSelection = (delta: number) => {
        const n = (showCreateButton ? 1 : 0) + tagSearch.length;
        setSelectedIndex((selectedIndex + delta + n) % n);
    };

    const createButtonClick = () => {
        if (!hasNamespace) {
            const newNamespace = `${input}:`;
            setInput(newNamespace);
            searchTag(newNamespace);
            setSelectedIndex(0);
        } else {
            addTag(input);
        }
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (disabled) {
            return;
        }

        switch (event.key) {
            case 'Backspace': {
                if (input !== '' || thisTags.length === 0) {
                    return;
                }
                event.preventDefault();
                const ta = thisTags[thisTags.length - 1];
                removeTag(thisTags.length - 1);
                setInput(TagToString(ta));
                return;
            }
            case 'Escape':
                event.preventDefault();
                setOpen(false);
                return;

            case 'Enter': {
                event.preventDefault();

                if (open) {
                    const index = selectedIndex + (showCreateButton ? -1 : 0);

                    if (index >= 0 && index < tagSearch.length) {
                        const tag = tagSearch[index];
                        TryAddTag(TagToString(tag));
                    } else if (index === -1) {
                        createButtonClick();
                    }
                } else if (TagIsValid(input)) {
                    addTag(input);
                }
                return;
            }

            case 'ArrowDown':
                if (open) {
                    event.preventDefault();
                    moveSelection(1);
                }
                return;

            case 'ArrowUp':
                if (open) {
                    event.preventDefault();
                    moveSelection(-1);
                }
                return;

            case 'Tab':
                if (open) {
                    event.preventDefault();
                    moveSelection(event.shiftKey ? -1 : 1);
                }
                return;
        }
    };

    return (
        <div ref={containerRef} onFocusOut={onFocusOut} className="w-full flex flex-wrap items-center gap-1 px-2 py-1 text-sm">
            {thisTags.map((tag, i) => (
                <span key={tag} className="flex items-center min-h-8 bg-c-magenta text-c-black rounded-2xl">
                    <span className="pl-3 mr-2 break-words">
                        {tag.namespace}:{tag.name}
                    </span>
                    <button
                        className="px-2 mr-1 font-bold  bg-transparent border-none rounded-2xl text-inherit"
                        type="button"
                        onClick={() => removeTag(i)}
                    >
                        ×
                    </button>
                </span>
            ))}

            <div className="relative w-full">
                <input
                    ref={inputRef}
                    className="flex-1 w-full min-w-[6ch] border-none outline-none py-0.5"
                    value={input}
                    disabled={disabled}
                    placeholder={placeholder}
                    onInput={(e) => {
                        const newVal = (e.target as HTMLInputElement).value;
                        setInput(newVal);
                        debounceSearch(newVal);
                    }}
                    onKeyDown={onKeyDown}
                    onFocusIn={openOnFocusIn}
                />

                {open && (showCreateButton || (tagSearch && tagSearch.length > 0)) && (
                    <ul
                        ref={listRef}
                        class={`absolute z-10 b-0 border mt-1 max-h-60 overflow-auto rounded shadow smooth-scroll whitespace-nowrap`}
                    >
                        {showCreateButton && (
                            <li
                                tabindex={-1}
                                class={`${selectedIndex === 0 ? 'bg-c-l-black' : 'bg-c-black'} p-2 hover:bg-c-l-black cursor-pointer`}
                                onClick={() => {
                                    createButtonClick();
                                    inputRef.current?.focus();
                                }}
                            >
                                <span className="text-c-l-green">{hasNamespace ? 'New tag' : 'New namespace'}:</span> {input}
                            </li>
                        )}

                        {tagSearch &&
                            tagSearch.length > 0 &&
                            tagSearch.map((item, i) => {
                                const tagStr = `${item.namespace}:${item.name}`;
                                const thisIndex = (showCreateButton ? -1 : 0) + selectedIndex;
                                const color = thisIndex === i ? 'bg-c-l-black' : 'bg-c-black';
                                return (
                                    <li
                                        tabindex={-1}
                                        key={tagStr}
                                        class={`${color} p-2 hover:bg-c-l-black cursor-pointer`}
                                        onClick={() => {
                                            TryAddTag(tagStr);
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        {tagStr}
                                    </li>
                                );
                            })}
                    </ul>
                )}
            </div>
        </div>
    );
}
