import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {CHART_LABELS, ChartType, DashboardCard, NewDashboardCard, UserDashboard} from './common';
import {DashboardCardComponent} from './dashboard_card';
import {AddEditDashboardPanel} from './add_edit_dashboard_panel';
import {TblUserDashboard} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {DropdownButton} from '../../components/drop_down_button';

type DashboardProps = {
    baseState: BaseState;
    tagColors: Map<string, string>;
    dashboard: TblUserDashboard;
    onUpdate: (dashboard: UserDashboard) => Promise<void>;
    onDelete: (dashboard: UserDashboard) => void;
};

// Card ids key the rendered list, so they must be unique and survive a save
// round-trip. The saved blob carries them; this only fills in cards that are
// missing an id or collide with one already taken.
const NormalizeCardIds = (cards: DashboardCard[]): DashboardCard[] => {
    const seen = new Set<number>();
    let next = cards.reduce((max, c) => (typeof c.id === 'number' ? Math.max(max, c.id) : max), -1) + 1;

    return cards.map((card) => {
        if (typeof card.id === 'number' && !seen.has(card.id)) {
            seen.add(card.id);
            return card;
        }

        const id = next++;
        seen.add(id);
        return {...card, id};
    });
};

const NextCardId = (cards: DashboardCard[]): number => cards.reduce((max, c) => Math.max(max, c.id), -1) + 1;

export const DashboardComponent = ({baseState, tagColors, dashboard, onUpdate, onDelete}: DashboardProps) => {
    // The saved server state, and the baseline that Cancel reverts to.
    const {savedCards, parseError} = useMemo<{savedCards: DashboardCard[]; parseError: string | null}>(() => {
        try {
            const parsed = JSON.parse(dashboard.data);

            if (!Array.isArray(parsed)) {
                return {savedCards: [], parseError: 'Dashboard data is not a list of charts'};
            }

            return {savedCards: NormalizeCardIds(parsed as DashboardCard[]), parseError: null};
        } catch (e) {
            return {savedCards: [], parseError: e instanceof Error ? e.message : `An unknown error occurred: ${e}`};
        }
    }, [dashboard.data]);

    const [cards, setCards] = useState<DashboardCard[]>(savedCards);
    const [editingCardId, setEditingCardId] = useState<number | null>(null);
    const [addType, setAddType] = useState<ChartType>('macros');
    const [renaming, setRenaming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Card components seed their form state from the card prop at mount and never
    // resync, so throwing away working state has to remount them. Bumping this
    // changes their keys, which is the only thing that reliably does it.
    const [generation, setGeneration] = useState(0);

    const revertToSaved = () => {
        setCards(savedCards);
        setEditingCardId(null);
        setGeneration((g) => g + 1);
    };

    const isFirstSync = useRef(true);
    const cardsRef = useRef(cards);
    cardsRef.current = cards;

    useEffect(() => {
        if (isFirstSync.current) {
            isFirstSync.current = false;
            return;
        }
        // Our own saves round-trip the same cards back through the prop; adopting
        // them would remount every chart for no reason.
        if (JSON.stringify(savedCards) === JSON.stringify(cardsRef.current)) {
            return;
        }
        revertToSaved();
    }, [savedCards]);

    const persist = async (nextCards: DashboardCard[], name: string): Promise<boolean> => {
        setSaving(true);
        setSaveError(null);
        try {
            await onUpdate({id: dashboard.id, name, cards: nextCards});
            return true;
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : `An unknown error occurred: ${e}`);
            return false;
        } finally {
            setSaving(false);
        }
    };

    // A card that isn't in the saved blob yet has never been persisted, so
    // cancelling its editor should throw it away rather than keep a blank chart.
    const isDraftCard = (id: number) => !savedCards.some((c) => c.id === id);

    const handleAddChart = () => {
        const card = {...NewDashboardCard(addType), id: NextCardId(cards)};
        setCards([...cards, card]);
        setEditingCardId(card.id);
    };

    const handleSaveCard = async (index: number, updated: DashboardCard) => {
        const prev = cards;
        const next = cards.map((c, i) => (i === index ? updated : c));

        setCards(next);
        if (!(await persist(next, dashboard.name))) {
            setCards(prev);
            return;
        }
        setEditingCardId(null);
    };

    const handleCancelEdit = (index: number) => {
        const card = cards[index];
        if (card && isDraftCard(card.id)) {
            setCards(cards.filter((_, i) => i !== index));
        }
        setEditingCardId(null);
        setSaveError(null);
    };

    const handleRemove = async (index: number) => {
        const prev = cards;
        const removed = prev[index];
        if (!removed) {
            return;
        }

        // A draft was never persisted, so there's nothing to lose and nothing to
        // write - drop it the same way cancelling its editor would.
        const isDraft = isDraftCard(removed.id);

        if (!isDraft && !confirm(`Do you want to delete the chart "${removed.title}"?`)) {
            return;
        }

        const next = prev.filter((_, i) => i !== index);

        setCards(next);
        if (editingCardId === removed.id) {
            setEditingCardId(null);
        }

        if (isDraft) {
            return;
        }
        if (!(await persist(next, dashboard.name))) {
            setCards(prev);
        }
    };

    const handleDuplicate = async (index: number) => {
        const source = cards[index];
        if (!source) {
            return;
        }

        const copy = {...source, id: NextCardId(cards), title: `${source.title} Copy`};
        const insertAt = index + 1;
        const next = [...cards.slice(0, insertAt), copy, ...cards.slice(insertAt)];

        setCards(next);
        setEditingCardId(copy.id);
        if (!(await persist(next, dashboard.name))) {
            setCards(cards);
            setEditingCardId(null);
        }
    };

    const handleMove = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= cards.length) {
            return;
        }

        const prev = cards;
        const next = [...cards];
        [next[index], next[target]] = [next[target], next[index]];

        setCards(next);
        if (!(await persist(next, dashboard.name))) {
            setCards(prev);
        }
    };

    const handleRename = async (name: string) => {
        if (await persist(cards, name)) {
            setRenaming(false);
        }
    };

    return (
        <>
            <ErrorDiv errorMsg={parseError} />
            {editingCardId === null && <ErrorDiv errorMsg={saveError} />}

            <div className="flex flex-wrap items-center justify-between gap-2 my-4">
                <div className="flex flex-row flex-wrap items-center gap-2">
                    <select
                        className="px-2 py-1"
                        value={addType}
                        aria-label="New chart type"
                        onChange={(e) => setAddType((e.target as HTMLSelectElement).value as ChartType)}
                    >
                        {(Object.keys(CHART_LABELS) as ChartType[]).map((t) => (
                            <option key={t} value={t}>
                                {CHART_LABELS[t]}
                            </option>
                        ))}
                    </select>
                    <button className="btn-outlined-success px-3 py-1 wsnw" onClick={handleAddChart} disabled={saving}>
                        + Add Chart
                    </button>
                </div>

                <DropdownButton
                    actions={[
                        {label: 'Rename View', onClick: () => setRenaming(true)},
                        {
                            label: 'Delete View',
                            dangerous: true,
                            onClick: () => onDelete({id: dashboard.id, name: dashboard.name, cards}),
                        },
                    ]}
                />
            </div>

            {renaming && (
                <AddEditDashboardPanel
                    className="mb-8"
                    titleLabel="Rename View"
                    initialName={dashboard.name}
                    confirmLabel="Save"
                    saving={saving}
                    onConfirm={handleRename}
                    onCancel={() => setRenaming(false)}
                />
            )}

            <div class="flex flex-col gap-8">
                {cards.map((card, index) => {
                    return (
                        <DashboardCardComponent
                            key={`${generation}-${card.id}`}
                            card={card}
                            eventlogs={baseState.eventlogs}
                            bodylogs={baseState.bodylogs}
                            bodyMetrics={baseState.bodyMetrics}
                            timespans={baseState.timespans}
                            dayOffsetSeconds={baseState.user.day_time_offset_seconds}
                            caloricCalcMethod={baseState.user.caloric_calc_method}
                            namespaces={baseState.namespaces}
                            setNamespaces={baseState.setNamespaces}
                            tagColors={tagColors}
                            editing={editingCardId === card.id}
                            isFirst={index === 0}
                            isLast={index === cards.length - 1}
                            saving={saving}
                            saveError={editingCardId === card.id ? saveError : null}
                            onStartEdit={() => setEditingCardId(card.id)}
                            onCancelEdit={() => handleCancelEdit(index)}
                            onSave={(updated) => handleSaveCard(index, updated)}
                            onDuplicate={() => handleDuplicate(index)}
                            onRemove={() => handleRemove(index)}
                            onMoveUp={() => handleMove(index, -1)}
                            onMoveDown={() => handleMove(index, 1)}
                        />
                    );
                })}
            </div>
        </>
    );
};
