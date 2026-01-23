import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';
import {FuzzySearch} from './select_list';
import {TblUserTag} from '../api/types';
import {HasNamespace, SplitTag} from '../utils/tags';
import {useDebouncedCallback} from '../hooks/useDebounce';
import {ApiGetUserNamespacesTags} from '../api/api';

type TagInputProps = {
    namespaces: string[];
    thisTags: TblUserTag[];
    onChange: (tags: TblUserTag[]) => void;
    placeholder?: string;
    disabled?: boolean;
};

export function TagInput({namespaces, thisTags, onChange, placeholder = 'Add tag', disabled = false}: TagInputProps) {
    const [input, setInput] = useState('');
    const [hasFocus, setHasFocus] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const listRef = useRef<HTMLUListElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [tagSearch, setTagSearch] = useState<TblUserTag[]>(namespaces.map((n) => { return { namespace: n, name: '', } as TblUserTag; }));

    const searchTag = useCallback((searchTagStr: string) => {
        const tag2Search = SplitTag(searchTagStr);

        if (!HasNamespace(searchTagStr)) {
            console.info("namespace search", searchTagStr);
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
            return;
        }
            console.info("tag search", searchTagStr);

        ApiGetUserNamespacesTags(tag2Search.namespace, tag2Search.name).then((foundTags: TblUserTag[]) => {
            setTagSearch(foundTags);
        });

    }, [ namespaces]);

    const [debounceSearch, cancelDebounce] = useDebouncedCallback(searchTag, 400);

    const addTag = (raw: string) => {
        const tag = SplitTag(raw.trim());

        if (!tag.namespace && !tag.name) {
            return;
        }
        const t = thisTags.filter((x) => x.namespace !== tag.namespace || x.name !== tag.name);

        if (t.length === thisTags.length) {
            onChange([...thisTags, tag]);
        } else {
            onChange([...t]);
        }

        setInput('');
    };

    const removeTag = (index: number) => {
        onChange(thisTags.filter((_, i) => i !== index));
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (disabled) {
            return;
        }

        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            e.preventDefault();
            addTag(input);
        }

        if (e.key === 'Backspace' && input === '' && thisTags.length > 0) {
            e.preventDefault();
            const t = thisTags[thisTags.length - 1];
            removeTag(thisTags.length - 1);
            setInput(`${t.namespace}:${t.name}`);
        }
    };

    return (
        <div className="w-full flex flex-wrap items-center gap-1 px-2 py-1 text-sm">
            {thisTags.map((tag, i) => (
                <span key={tag} className="flex items-center min-h-8 bg-c-magenta text-c-black rounded-2xl">
                    <span className="pl-3 mr-2 break-words">
                        {tag.namespace}:{tag.name}
                    </span>
                    <button
                        className="px-2 mr-1  font-bold  bg-transparent border-none rounded-2xl text-inherit"
                        type="button"
                        onClick={() => removeTag(i)}
                    >
                        ×
                    </button>
                </span>
            ))}

            <div className="relative ">
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
                onFocusIn={()=>setHasFocus(true)}
                // onFocusOut={()=>setHasFocus(false)}
            />

                {hasFocus &&
                <ul ref={listRef} class={`absolute z-10 b-0 border mt-1 max-h-60 overflow-auto rounded shadow smooth-scroll whitespace-nowrap`}>

                        <li class="bg-c-black  p-2 hover:bg-c-l-black cursor-pointer"
                        onClick={()=>{

                            if(!HasNamespace(input)){
                                setInput(input + ':');
                            } else {
                                addTag(input);
                            }
                        }}

                        >
                        { HasNamespace(input)
                            ? 'New tag'
                            :'New namespace'
                        }: {input} </li>

                    {tagSearch && tagSearch.length > 0 && (
                        tagSearch.map((item, i) => {
                            const tagStr = `${item.namespace}:${item.name}`;
                            return (
                                <li
                                    tabindex={-1}
                                    key={tagStr}
                                    class={`${selectedIndex === i ? 'bg-c-l-black' : 'bg-c-black'}  p-2 hover:bg-c-l-black cursor-pointer`}
                                    onClick={()=>{
                                        console.info("setting input");
                                        setInput(tagStr);
                                        searchTag(tagStr);
                                    }}
                                >
                                {tagStr}
                                </li>
                            );
                        })
                    )}
                </ul>
}
            </div>
        </div>
    );
}
