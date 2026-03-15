import {useCallback, useLayoutEffect, useMemo, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {ApiError, ApiGetUserTags, ApiNewUserTag, ApiDeleteUserTag, ApiUpdateUserTag} from '../../api/api';
import {TblUserTag} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {TagToString} from '../../utils/tags';
import {DropdownButton} from '../../components/drop_down_button';

export function TagsPage(state: BaseState) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [allTags, setAllTags] = useState<TblUserTag[]>([]);

    const [showNewTag, setShowNewTag] = useState(false);
    const [newNamespace, setNewNamespace] = useState('');
    const [newName, setNewName] = useState('');

    const [editingTag, setEditingTag] = useState<TblUserTag | null>(null);
    const [editNamespace, setEditNamespace] = useState('');
    const [editName, setEditName] = useState('');

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

    const filteredTags = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) {
            return allTags;
        }
        return allTags.filter((t) => t.namespace.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }, [allTags, search]);

    const createTag = () => {
        const ns = newNamespace.trim();
        const nm = newName.trim();
        if (!ns || !nm) {
            setErrorMsg('Namespace and name are required');
            return;
        }
        ApiNewUserTag({namespace: ns, name: nm})
            .then((tag: TblUserTag) => {
                setAllTags((old) => [...old, tag].sort((a, b) => TagToString(a).localeCompare(TagToString(b))));
                setShowNewTag(false);
                setNewNamespace('');
                setNewName('');
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const deleteTag = (tag: TblUserTag) => {
        if (!confirm(`Delete tag "${TagToString(tag)}"?`)) {
            return;
        }
        ApiDeleteUserTag(tag)
            .then(() => {
                setAllTags((old) => old.filter((t) => !(t.namespace === tag.namespace && t.name === tag.name)));
            })
            .catch(handleErr);
    };

    const startEdit = (tag: TblUserTag) => {
        setEditingTag(tag);
        setEditNamespace(tag.namespace);
        setEditName(tag.name);
        setErrorMsg(null);
    };

    const saveEdit = () => {
        if (!editingTag) {
            return;
        }
        const ns = editNamespace.trim();
        const nm = editName.trim();
        if (!ns || !nm) {
            setErrorMsg('Namespace and name are required');
            return;
        }
        ApiUpdateUserTag(editingTag, ns, nm)
            .then(() => {
                setAllTags((old) =>
                    old
                        .map((t) =>
                            t.namespace === editingTag.namespace && t.name === editingTag.name ? {namespace: ns, name: nm} : t
                        )
                        .sort((a, b) => TagToString(a).localeCompare(TagToString(b)))
                );

                state.setTimespans((old) =>
                    old === null
                        ? null
                        : old.map((ts) => {
                              for (let i = 0; i < ts.tags.length; i++) {
                                  const t = ts.tags[i];
                                  if (t.namespace === editingTag.namespace && t.name === editingTag.name) {
                                      t.namespace = ns;
                                      t.name = nm;
                                  }
                              }
                              return ts;
                          })
                );
                setEditingTag(null);
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`px-3 py-1 ${showNewTag ? 'font-bold bg-c-red' : ''}`}
                    onClick={() => {
                        setShowNewTag((x) => !x);
                        setErrorMsg(null);
                    }}
                >
                    {showNewTag ? 'Cancel' : '+ New Tag'}
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewTag && (
                <div className="mb-4 p-3 border rounded container-theme flex flex-col gap-2">
                    <h2 class="text-lg font-bold">New Tag</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 px-2 py-1"
                            placeholder="Namespace"
                            value={newNamespace}
                            onInput={(e) => setNewNamespace(e.currentTarget.value)}
                        />
                        <input
                            type="text"
                            className="flex-1 px-2 py-1"
                            placeholder="Name"
                            value={newName}
                            onInput={(e) => setNewName(e.currentTarget.value)}
                        />
                        <button className="px-3 py-1 font-bold bg-c-green" onClick={createTag}>
                            Create
                        </button>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    className="flex-1 px-2 py-1"
                    placeholder="Search tags..."
                    value={search}
                    onInput={(e) => setSearch(e.currentTarget.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                {filteredTags.length === 0 ? (
                    <p>{allTags.length === 0 ? 'No tags found.' : 'No tags match your search.'}</p>
                ) : (
                    filteredTags.map((t: TblUserTag) => {
                        const tagStr = TagToString(t);
                        const isEditing = editingTag?.namespace === t.namespace && editingTag?.name === t.name;
                        return (
                            <div key={tagStr} className="container-theme flex items-center gap-2">
                                {isEditing ? (
                                    <div className="flex flex-col flex-1 gap-2">
                                        <div className="flex flex-1 gap-2">
                                            <input
                                                type="text"
                                                className="w-full py-1"
                                                placeholder="Namespace"
                                                value={editNamespace}
                                                onInput={(e) => setEditNamespace(e.currentTarget.value)}
                                            />
                                            <input
                                                type="text"
                                                className="w-full py-1"
                                                placeholder="Name"
                                                value={editName}
                                                onInput={(e) => setEditName(e.currentTarget.value)}
                                            />
                                        </div>

                                        <div className="flex flex-row gap-2 justify-end">
                                            <button
                                                className="w-full font-bold max-w-32 bg-c-red"
                                                onClick={() => {
                                                    setEditingTag(null);
                                                    setErrorMsg(null);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button className="w-full font-bold max-w-32 bg-c-green" onClick={saveEdit}>
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <span className="flex-1 text-sm">{tagStr}</span>
                                        <DropdownButton
                                            actions={[
                                                {label: 'Edit', onClick: () => startEdit(t)},
                                                {label: 'Delete', dangerous: true, onClick: () => deleteTag(t)},
                                            ]}
                                        />
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}
