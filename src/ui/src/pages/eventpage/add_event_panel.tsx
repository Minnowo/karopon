import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'preact/hooks';
import {
    CreateUserEventLog,
    InsertUserFoodLog,
    TblUser,
    TblUserEvent,
    TblUserFood,
    TblUserFoodLog,
    TblUserFoodLogWithKey,
    UserEventFoodLog,
    UserTimeFormat,
} from '../../api/types';
import {FuzzySearch} from '../../components/select_list';
import {DoRender} from '../../hooks/doRender';
import {TblUserFoodLogFactory} from '../../api/factories';
import {CalcInsulin} from '../../utils/insulin';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {FormatSmartTimestamp} from '../../utils/date_utils';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';
import {DAY_IN_MS, TimeLocalMS} from '../../utils/time';
import {AddFoodlogPanelRow} from '../../components/add_foodlog_row';
import {NumberInput} from '../../components/number_input';
import {TimeInput} from '../../components/time_input';

// RowErrors holds the server's messages for one food row.
type RowErrors = {
    name?: string;
    portion?: string;
};

type AddEventsPanelState = {
    dialogTitle: string;
    saveButtonTitle: string;
    user: TblUser;
    foods: TblUserFood[];
    events: TblUserEvent[];
    eventlogs: UserEventFoodLog[];
    fromEvent: UserEventFoodLog;
    // Saves the event; rejects with an ApiError when the server refuses it.
    createEvent: (e: CreateUserEventLog) => Promise<void>;
    onCancel: () => void;
    copyDate?: boolean;
};

export function AddEventsPanel(p: AddEventsPanelState) {
    // Used for the foods array key={} when rendering the food list.
    // The foods array is a ref which is passed into the row component, where it is edited by ref.
    // This ensures that each row in the array has a unique key for proper re-render.
    const keyRef = useRef<number>(-1);

    const mutateWithKey = (l: TblUserFoodLog): TblUserFoodLogWithKey => {
        (l as TblUserFoodLogWithKey).key = --keyRef.current;
        return l as TblUserFoodLogWithKey;
    };

    const [event, setEvent] = useState<string>(p.fromEvent.eventlog.event);
    const [eventTime, setEventTime] = useState<Date>(p.copyDate ? new Date(p.fromEvent.eventlog.user_time) : new Date());
    const [bloodSugar, setBloodSugar] = useState<number>(p.fromEvent.eventlog.blood_glucose);
    const [insulinToCarbRatio, setInsulinToCarbRatio] = useState<number>(p.fromEvent.eventlog.insulin_to_carb_ratio);
    const [insulinTaken, setInsulinTaken] = useState<number>(p.fromEvent.eventlog.actual_insulin_taken);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [saving, setSaving] = useState(false);
    // Server field errors: the event name, and per food row keyed by the row's key.
    const [eventNameError, setEventNameError] = useState<string | undefined>(undefined);
    const [rowErrors, setRowErrors] = useState<Map<number, RowErrors>>(new Map());
    const focusFirstInvalid = useRef<boolean>(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const eventNameErrorId = `${useId()}-event-name-error`;
    const foods = useRef<TblUserFoodLogWithKey[]>([]);
    const trailingRows = Math.max(1, p.user.event_log_trailing_rows);

    const render = DoRender();

    const ensureTrailingRows = () => {
        let trailingEmpty = 0;
        for (let i = foods.current.length - 1; i >= 0; i--) {
            if (foods.current[i].name === '') {
                trailingEmpty++;
            } else {
                break;
            }
        }
        while (trailingEmpty < trailingRows) {
            foods.current.push(mutateWithKey(TblUserFoodLogFactory.empty()));
            trailingEmpty++;
        }
    };

    const renderWithTrailing = () => {
        ensureTrailingRows();
        render();
    };

    const setFromLastEvent = useCallback(
        (fromEvent: UserEventFoodLog) => {
            setEvent(fromEvent.eventlog.event);
            setBloodSugar(fromEvent.eventlog.blood_glucose);
            setInsulinToCarbRatio(fromEvent.eventlog.insulin_to_carb_ratio);
            setInsulinTaken(fromEvent.eventlog.actual_insulin_taken);
            foods.current = new Array<TblUserFoodLogWithKey>(fromEvent.foodlogs.length + trailingRows);
            let i = 0;
            for (; i < fromEvent.foodlogs.length; i++) {
                foods.current[i] = {...fromEvent.foodlogs[i], key: --keyRef.current};
            }
            for (; i < foods.current.length; i++) {
                foods.current[i] = {...TblUserFoodLogFactory.empty(), key: --keyRef.current};
            }
        },
        [trailingRows]
    );

    useLayoutEffect(() => {
        setEventTime(p.copyDate ? new Date(p.fromEvent.eventlog.user_time) : new Date());
        setFromLastEvent(p.fromEvent);
        // A different starting event (e.g. Copy while the panel is open) makes old errors meaningless.
        setErrorMsg(null);
        setEventNameError(undefined);
        setRowErrors(new Map());
    }, [p.fromEvent, p.copyDate, setFromLastEvent]);

    const totals = (() => {
        const cols = [0, 0, 0, 0];
        for (let i = 0; i < foods.current.length; i++) {
            if (foods.current[i].portion !== 0 && foods.current[i].name !== '') {
                cols[0] += foods.current[i].protein;
                cols[1] += foods.current[i].carb;
                cols[2] += foods.current[i].fibre;
                cols[3] += foods.current[i].fat;
            }
        }
        return {
            protein: cols[0],
            carb: cols[1],
            fibre: cols[2],
            fat: cols[3],
        };
    })();

    const days = Math.floor(TimeLocalMS(eventTime) / DAY_IN_MS); // used for left-right side tracking
    const netCarb = totals.carb - totals.fibre;
    const insulin = CalcInsulin(
        netCarb,
        bloodSugar,
        p.user.target_blood_sugar,
        insulinToCarbRatio,
        p.user.insulin_sensitivity_factor
    );
    const calories = CalculateCalories(
        totals.protein,
        netCarb,
        totals.fibre,
        totals.fat,
        Str2CalorieFormula(p.user.caloric_calc_method)
    ).toFixed(0);

    // After the server rejects fields, move focus to the first one it marked.
    useEffect(() => {
        if (!focusFirstInvalid.current) {
            return;
        }
        focusFirstInvalid.current = false;
        rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, [eventNameError, rowErrors]);

    const clearRowError = (key: number) => {
        setRowErrors((prev) => {
            if (!prev.has(key)) {
                return prev;
            }
            const next = new Map(prev);
            next.delete(key);
            return next;
        });
    };

    // showServerErrors puts the server's field errors on the event name and on the rows they came from.
    // sentKeys[i] is the key of the row sent as foods[i]; empty rows are not sent.
    const showServerErrors = (e: ApiError, sentKeys: number[]) => {
        let nameError: string | undefined;
        const rows = new Map<number, RowErrors>();
        for (const [pointer, detail] of e.fieldErrors()) {
            if (pointer === '#/event/name' || pointer === '#/eventlog/event') {
                nameError = detail;
                continue;
            }
            const m = /^#\/(?:foods|foodlogs)\/(\d+)\/(name|portion)$/.exec(pointer);
            if (m === null) {
                continue;
            }
            const index = Number(m[1]);
            if (index < 0 || index >= sentKeys.length) {
                continue;
            }
            const key = sentKeys[index];
            const row = rows.get(key) ?? {};
            if (m[2] === 'name') {
                row.name = detail;
            } else {
                row.portion = detail;
            }
            rows.set(key, row);
        }
        focusFirstInvalid.current = nameError !== undefined || rows.size > 0;
        setEventNameError(nameError);
        setRowErrors(rows);
    };

    const onCreateClick = async () => {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setEventNameError(undefined);
        setRowErrors(new Map());
        setSaving(true);

        const sent = foods.current.filter((x) => x.name.trim().length > 0);
        const sentKeys = sent.map((x) => x.key);

        const save = p.createEvent({
            blood_glucose: bloodSugar,
            blood_glucose_target: p.user.target_blood_sugar,
            insulin_sensitivity_factor: p.user.insulin_sensitivity_factor,
            insulin_to_carb_ratio: insulinToCarbRatio,
            recommended_insulin_amount: insulin,
            actual_insulin_taken: insulinTaken,
            created_time: eventTime.getTime(),
            event: {
                id: 0,
                user_id: p.user.id,
                name: event.trim(),
            },
            foods: sent.map((x: TblUserFoodLog): InsertUserFoodLog => {
                return {
                    name: x.name.trim(),
                    event: x.event.trim(),
                    unit: x.unit.trim(),
                    portion: x.portion,
                    protein: x.protein,
                    carb: x.carb,
                    fibre: x.fibre,
                    fat: x.fat,
                };
            }),
        });

        try {
            await save;
        } catch (e: unknown) {
            if (e instanceof ApiError) {
                showServerErrors(e, sentKeys);
                setErrorMsg(e);
            } else {
                setErrorMsg(e instanceof Error ? e : String(e));
            }
        } finally {
            setSaving(false);
        }
    };

    const buildTableHead = () => {
        return (
            <tr className="text-xs text-center">
                <th className="text-left py-1" />
                <th className="py-1">Amt</th>
                <th className="py-1 pr-2">Fat</th>
                <th className="py-1 pr-2">Carb</th>
                <th className="py-1 pr-2">Fib</th>
                <th className="py-1 pr-2">Prot</th>
                <th className="py-1 pr-2">Net</th>
                <th className="py-1 pr-2">Cal</th>
                <th className="py-1" />
            </tr>
        );
    };

    const buildSumRow = () => {
        return (
            <>
                {foods.current.length > 1 && (
                    <tr className="border-none text-center">
                        <th className="text-right w-full" />
                        <th className="pr-1">-</th>
                        <th className="pr-2 text-right"> {totals.fat.toFixed(1)}</th>
                        <th className="pr-2 text-right">{totals.carb.toFixed(1)}</th>
                        <th className="pr-2 text-right">{totals.fibre.toFixed(1)}</th>
                        <th className="pr-2 text-right">{totals.protein.toFixed(1)}</th>
                        <th className="pr-2 text-right"> {netCarb.toFixed(1)}</th>
                        <th className="pr-2 text-right">{calories}</th>
                        <th />
                    </tr>
                )}
            </>
        );
    };

    return (
        <div ref={rootRef} className="w-full surface-1 flex flex-col gap-2">
            <div className="flex w-full justify-between items-center gap-2">
                <h2>{p.dialogTitle}</h2>
                <small>{FormatSmartTimestamp(eventTime.getTime())}</small>
                <span />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start w-full gap-2">
                <div className="w-full flex flex-col gap-1">
                    <FuzzySearch<TblUserEvent>
                        query={event}
                        onQueryChange={(q) => {
                            setEvent(q);
                            setEventNameError(undefined);
                        }}
                        data={p.events}
                        dataDisplayStr={(d: TblUserEvent) => d.name}
                        dataSearchStr={(d: TblUserEvent) => d.name}
                        className="w-full"
                        placeholder="Event Name"
                        noResultsText="New Event"
                        invalid={eventNameError !== undefined}
                        errorId={eventNameErrorId}
                        onSelect={(evnt: TblUserEvent | null) => {
                            if (!evnt) {
                                return;
                            }
                            setEvent(evnt.name);

                            if (p.user.fill_eventlog_from_last) {
                                for (const lastEvt of p.eventlogs) {
                                    if (lastEvt.eventlog.event === evnt.name) {
                                        setFromLastEvent(lastEvt);
                                        break;
                                    }
                                }
                            }
                        }}
                        autofocus={p.fromEvent.eventlog.event.trim() === ''}
                    />

                    <FieldError id={eventNameErrorId} message={eventNameError} />
                </div>

                <TimeInput
                    skipTabIndex={true}
                    value={new Date(eventTime)}
                    onChange={setEventTime}
                    showDate={true}
                    hour12={p.user.time_format === UserTimeFormat.Hour12}
                />

                {p.user.show_diabetes && (
                    <NumberInput
                        className="flex-1 flex-grow"
                        innerClassName="w-full min-w-12"
                        label="Blood Sugar"
                        value={bloodSugar}
                        onValueChange={setBloodSugar}
                        min={0}
                    />
                )}
            </div>

            <div className="overflow-x-scroll surface-2 px-0 py-1">
                <table className="w-full text-sm border-collapse table-borderless">
                    <tbody>
                        {buildTableHead()}
                        {buildSumRow()}
                        {foods.current.map((food: TblUserFoodLogWithKey, index: number) => {
                            return (
                                <AddFoodlogPanelRow
                                    key={food.key}
                                    user={p.user}
                                    foods={p.foods}
                                    food={food}
                                    render={() => {
                                        clearRowError(food.key);
                                        renderWithTrailing();
                                    }}
                                    deleteSelf={() => {
                                        clearRowError(food.key);
                                        foods.current.splice(index, 1);
                                        renderWithTrailing();
                                    }}
                                    nameError={rowErrors.get(food.key)?.name}
                                    portionError={rowErrors.get(food.key)?.portion}
                                />
                            );
                        })}

                        {buildTableHead()}
                        {buildSumRow()}
                        <tr className="block sm:hidden">
                            {/* This is here so that you have some room to scroll easier on mobile */}
                            <td>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="surface-2 flex flex-none justify-center items-center text-center gap-4">
                {p.user.show_diabetes && (
                    <>
                        {/* This is for type 1 diabetes where you need to prick your finger / inject insulin. It helps you swap sides / finger consistently so you're not always injecting / pricking the same spot everyday. */}
                        <span title="Insulin injection location and blood meter prick side (changes daily)">
                            {`${days % 2 === 0 ? 'Left' : 'Right'}-${days % 4 <= 1 ? 'Upper' : 'Lower'}`}
                        </span>
                        <span title="Insulin calculated for this event's food">Insulin Calc {insulin.toFixed(1)}</span>
                        <span title="Net carbs for this event's food">Net Carbs {netCarb.toFixed(1)}</span>
                    </>
                )}
                <span title={`This event's calories, formula used: ${p.user.caloric_calc_method}`}>Calories {calories}</span>
            </div>

            {p.user.show_diabetes && (
                <div className="w-full flex gap-2 flex-wrap flex-col sm:flex-row">
                    <NumberInput
                        className="flex-1 flex-grow"
                        innerClassName="w-full min-w-12"
                        label="Insulin To Carb Ratio"
                        value={insulinToCarbRatio}
                        onValueChange={setInsulinToCarbRatio}
                        min={0}
                    />
                    <NumberInput
                        className="flex-1 flex-grow"
                        innerClassName="w-full min-w-12"
                        label="Insulin Taken"
                        value={insulinTaken}
                        onValueChange={setInsulinTaken}
                        min={0}
                    />
                </div>
            )}
            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex justify-between sm:justify-end gap-2">
                <button onClick={p.onCancel}>Cancel</button>
                <button className="btn-success" onClick={onCreateClick} aria-disabled={saving || undefined}>
                    {saving ? 'Saving...' : p.saveButtonTitle}
                </button>
            </div>
        </div>
    );
}
