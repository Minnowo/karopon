import {useCallback, useLayoutEffect, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {ApiError, ApiGetUserTags, ApiNewUserTag} from '../../api/api';
import {TblUserTag} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {TagToString} from '../../utils/tags';

export function TagsPage(state: BaseState) {
    const namespaceRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    const [showNewTag, setShowNewTag] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [allTags, setAllTags] = useState<TblUserTag[]>([]);

    const handleErr = useCallback(
        (e: unknown) => {
            if (e instanceof ApiError) {
                setErrorMsg(e.message);
                if (e.isUnauthorizedError()) {
                    state.doRefresh();
                }
            } else if (e instanceof Error) {
                setErrorMsg(e.message);
            } else {
                setErrorMsg(`An unknown error occurred: ${e}`);
            }
        },
        [state]
    );

    useLayoutEffect(() => {
        ApiGetUserTags()
            .then((tags: TblUserTag[]) => setAllTags(tags))
            .catch(handleErr);
    }, [handleErr]);

    const createTag = () => {
        const namespace = namespaceRef.current?.value.trim() ?? '';
        const name = nameRef.current?.value.trim() ?? '';

        if (!namespace || !name) {
            setErrorMsg('Namespace and name are required');
            return;
        }

        ApiNewUserTag({namespace, name})
            .then((tag: TblUserTag) => {
                setAllTags((old) => [tag, ...old]);
                setShowNewTag(false);
                if (namespaceRef.current) {
                    namespaceRef.current.value = '';
                }
                if (nameRef.current) {
                    nameRef.current.value = '';
                }
            })
            .catch(handleErr);
    };

    return (
        <>
            <div className="flex justify-center my-4">
                <button
                    className="px-4 py-2 border rounded"
                    onClick={() => {
                        setShowNewTag((x) => !x);
                        setErrorMsg(null);
                    }}
                >
                    {showNewTag ? 'Cancel' : 'New Tag'}
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewTag && (
                <div className="mb-4 p-4 border rounded space-y-3">
                    <div>
                        <label className="block text-sm mb-1">Namespace</label>
                        <input
                            ref={namespaceRef}
                            type="text"
                            className="w-full border rounded px-2 py-1"
                            placeholder="e.g. project"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Name</label>
                        <input ref={nameRef} type="text" className="w-full border rounded px-2 py-1" placeholder="e.g. foo" />
                    </div>

                    <button className="px-4 py-2 border rounded" onClick={createTag}>
                        Create Tag
                    </button>
                </div>
            )}

            <div className="grid gap-2">
                {allTags.length === 0 ? (
                    <p>No tags found.</p>
                ) : (
                    allTags.map((t: TblUserTag) => {
                        const tagStr = TagToString(t);
                        return (
                            <div key={tagStr} className="p-2 border rounded">
                                <span className="text-sm">{tagStr}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}
