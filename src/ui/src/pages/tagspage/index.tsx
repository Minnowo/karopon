import {useCallback, useLayoutEffect, useMemo, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {
    ApiError,
    ApiGetUserTags,
    ApiNewUserTag,
    ApiDeleteUserTag,
    ApiUpdateUserTag,
    ApiSetUserTagColors,
    ApiDeleteUserTagColors,
} from '../../api/api';
import {TblUserTag, TblUserTagColor} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {TagToString} from '../../utils/tags';
import {DropdownButton} from '../../components/drop_down_button';
import {NumberInput} from '../../components/number_input';
import {TagColorPanel} from './tag_color_panel';
import {AddTagPanel} from './add_tag_panel';

export const TagsPage = (state: BaseState) => {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [allTags, setAllTags] = useState<TblUserTag[]>([]);
    const [numberToShow, setNumberToShow] = useState<number>(15);

    const [showNewTag, setShowNewTag] = useState(false);
    const [showColorPanel, setShowColorPanel] = useState(false);

    const [editingTag, setEditingTag] = useState<TblUserTag | null>(null);

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
        [state.doRefresh]
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

    const createTag = (ns: string, nm: string) => {
        ApiNewUserTag({namespace: ns, name: nm})
            .then((tag) => {
                setAllTags((old) => [...old, tag].sort((a, b) => TagToString(a).localeCompare(TagToString(b))));
                setShowNewTag(false);
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const saveEdit = (tag: TblUserTag, ns: string, nm: string) => {
        ApiUpdateUserTag(tag, ns, nm)
            .then(() => {
                setAllTags((old) =>
                    old
                        .map((t) => (t.namespace === tag.namespace && t.name === tag.name ? {namespace: ns, name: nm} : t))
                        .sort((a, b) => TagToString(a).localeCompare(TagToString(b)))
                );
                state.setTimespans((old) =>
                    old === null
                        ? null
                        : old.map((ts) => {
                              for (let i = 0; i < ts.tags.length; i++) {
                                  const t = ts.tags[i];
                                  if (t.namespace === tag.namespace && t.name === tag.name) {
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

    const updateTagColors = (newTagColors: Record<string, string>) => {
        const toSet: TblUserTagColor[] = [];
        const toDelete: string[] = [];

        for (const ns of state.namespaces) {
            const t = (newTagColors[ns] ?? '').trim();
            const saved = state.tagColors.find((c) => c.namespace === ns)?.color;
            if (t === '' && saved !== undefined) {
                toDelete.push(ns);
            } else if (t !== '' && t !== saved) {
                toSet.push({user_id: state.user.id, namespace: ns, color: t});
            }
        }

        const ops: Array<Promise<void>> = [];

        if (toSet.length > 0) {
            ops.push(
                ApiSetUserTagColors(toSet).then(() =>
                    state.setTagColors((old) => {
                        const filtered = old!.filter((c) => !toSet.some((s) => s.namespace === c.namespace));
                        return [...filtered, ...toSet];
                    })
                )
            );
        }

        if (toDelete.length > 0) {
            ops.push(
                ApiDeleteUserTagColors(toDelete).then(() =>
                    state.setTagColors((old) => old!.filter((c) => !toDelete.includes(c.namespace)))
                )
            );
        }

        Promise.all(ops)
            .then(() => setShowColorPanel(false))
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
                    {showNewTag ? 'x New Tag' : '+ New Tag'}
                </button>
                <button
                    className={`px-3 py-1 ${showColorPanel ? 'font-bold bg-c-red' : ''}`}
                    onClick={() => setShowColorPanel((x) => !x)}
                >
                    {showColorPanel ? 'x Tag Colors' : 'Tag Colors'}
                </button>
                <NumberInput label={'Show'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewTag && <AddTagPanel onCreate={createTag} onCancel={() => setShowNewTag(false)} />}

            {showColorPanel && (
                <TagColorPanel
                    namespaces={state.namespaces}
                    tagColors={state.tagColors}
                    onUpdate={updateTagColors}
                    onCancel={() => setShowColorPanel(false)}
                />
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
                    filteredTags.slice(0, numberToShow).map((t: TblUserTag) => {
                        const tagStr = TagToString(t);
                        const isEditing = editingTag?.namespace === t.namespace && editingTag?.name === t.name;
                        return isEditing ? (
                            <AddTagPanel
                                key={tagStr}
                                initialNamespace={t.namespace}
                                initialName={t.name}
                                title="Edit Tag"
                                submitLabel="Save"
                                onCreate={(ns, nm) => saveEdit(t, ns, nm)}
                                onCancel={() => {
                                    setEditingTag(null);
                                    setErrorMsg(null);
                                }}
                            />
                        ) : (
                            <div key={tagStr} className="container-theme flex items-center gap-2">
                                <span className="flex-1 text-sm">{tagStr}</span>
                                <DropdownButton
                                    actions={[
                                        {label: 'Edit', onClick: () => setEditingTag(t)},
                                        {label: 'Delete', dangerous: true, onClick: () => deleteTag(t)},
                                    ]}
                                />
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
};
